import {createRequire} from 'node:module';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createApp} from '../sandbox/server.mjs';
import {dumpState,restoreState} from './state.mjs';
const require=createRequire(new URL('../sandbox/package.json',import.meta.url));
const express=require('express'),request=require('supertest');

export const QA_ORIGINS=['https://dovecupdatabase---qa.web.app','https://dovecupdatabase---qa.firebaseapp.com'];

export function createCloudAdapter({store,secret,importSecret=null,test=false,maxAttempts=4}) {
  if(typeof secret!=='string'||secret.length<32)throw Error('A private session secret is required');
  const api=express();
  api.disable('x-powered-by');
  api.use('/api/qa-initialize',express.json({limit:'9mb'}));
  api.use(express.json({limit:'128kb'}));
  api.use(async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    const host=req.get('x-forwarded-host')||req.get('x-fh-requested-host')||req.get('host');
    const origin=`https://${host}`;
    if(!QA_ORIGINS.includes(origin))return res.status(403).json({error:'qa_host_only'});
    if(!req.path.startsWith('/api/'))return res.status(404).json({error:'not_found'});
    if(!['GET','HEAD','POST','PATCH','PUT'].includes(req.method))return res.status(405).json({error:'method_not_allowed'});
    try {
      if(/^\/api\/(auth\/|setup-owner|me\/delete|qa-initialize)/.test(req.path)){
        const ip=req.get('x-forwarded-for')?.split(',')[0].trim()||req.socket.remoteAddress||'unknown';
        const now=Date.now(),key=value=>createHmac('sha256',secret).update(value).digest('hex');
        const username=typeof req.body?.username==='string'?req.body.username.trim().toLowerCase().slice(0,64):null;
        if(!await store.allowAttempt(key('global-auth'),now,200)||!await store.allowAttempt(key('ip:'+ip),now,20)||(username&&!await store.allowAttempt(key('username:'+username),now,20)))return res.status(429).json({error:'too_many_attempts'});
      }
      if(req.path==='/api/qa-initialize'){
        const supplied=typeof req.body?.token==='string'?Buffer.from(req.body.token):Buffer.alloc(0);
        const expected=typeof importSecret==='string'&&importSecret.length>=32?Buffer.from(importSecret):null;
        if(req.method!=='POST'||!expected||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return res.status(403).json({error:'import_not_authorized'});
        const {domain}=await createApp({seed:false,test:true});
        try{
          restoreState(domain,req.body.state);
          const administrators=domain.all("SELECT id,username FROM members WHERE role='admin' AND deleted_at IS NULL");
          if(administrators.length!==1||administrators[0].username!=='王鸽'||domain.get('SELECT COUNT(*) n FROM sessions').n!==0)return res.status(422).json({error:'invalid_qa_import'});
          if(!await store.initialize(dumpState(domain)))return res.status(409).json({error:'qa_already_initialized'});
          return res.status(201).json({ok:true,environment:'firebase-qa',administrator:'王鸽'});
        }finally{domain.close();}
      }
      // No response or cookie is delivered before the cloud compare-and-swap succeeds.
      for(let attempt=0;attempt<maxAttempts;attempt++){
        const state=await store.read();
        if(!state||!Number.isSafeInteger(state.revision))return res.status(503).json({error:'qa_database_not_initialized'});
        const {app,domain}=await createApp({seed:false,secret,publicOrigin:origin,firebaseQA:true,test});
        try {
          restoreState(domain,state);
          domain.run('DELETE FROM sessions WHERE expires<?',Date.now());
          const call=request(app)[req.method.toLowerCase()](req.originalUrl).set('Host',host).set('X-Forwarded-Proto','https');
          for(const name of ['cookie','origin','referer','sec-fetch-site','x-csrf-token','accept'])if(req.get(name))call.set(name,req.get(name));
          const result=await (['GET','HEAD'].includes(req.method)?call:call.send(req.body||{}));
          if(result.status>=500)return res.status(503).json({error:'qa_service_unavailable'});
          const next=dumpState(domain);
          if(next.payload!==state.payload&&!await store.commit(state.revision,next))continue;
          for(const name of ['set-cookie','content-type','content-disposition','x-content-type-options'])if(result.headers[name])res.set(name,result.headers[name]);
          return res.status(result.status).send(result.body instanceof Buffer?result.body:result.text);
        }finally{domain.close();}
      }
      return res.status(409).json({error:'version_conflict'});
    }catch(error){
      console.error('Firebase QA request failed:',error.code||error.name);
      return res.status(503).json({error:'qa_service_unavailable'});
    }
  });
  return api;
}
