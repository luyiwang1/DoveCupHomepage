import {cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createApp} from '../sandbox/server.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..'),out=resolve(here,'dist');
const require=createRequire(new URL('../sandbox/package.json',import.meta.url)),request=require('supertest');
const pages=['index','events','moments','signup','courts','scores','singles-championship','team-event','account','login','finance','owner-setup'];
await mkdir(resolve(out,'web'),{recursive:true});await mkdir(resolve(out,'functions/sandbox'),{recursive:true});await mkdir(resolve(out,'functions/firebase-qa'),{recursive:true});
const {app,domain}=await createApp({seed:false,test:true});
try{
  for(const page of pages){const result=await request(app).get(`/${page}.html`).set('Host','localhost');if(result.status!==200)throw Error('Failed to render '+page);await writeFile(resolve(out,'web',`${page}.html`),result.text);}
}finally{domain.close();}
for(const file of await readdir(root))if(['.js','.css','.webp','.png','.jpg','.jpeg','.svg','.woff','.woff2'].includes(extname(file)))await cp(resolve(root,file),resolve(out,'web',file));
for(const dir of ['assets','vendor'])await cp(resolve(root,dir),resolve(out,'web',dir),{recursive:true});
await cp(resolve(root,'sandbox/public'),resolve(out,'web/staging'),{recursive:true});
for(const file of ['language.js','venue-config.js'])await cp(resolve(root,'sandbox/live-signup',file),resolve(out,'web',file));
for(const file of ['server.mjs','domain.mjs','operations.mjs','package.json'])await cp(resolve(root,'sandbox',file),resolve(out,'functions/sandbox',file));
for(const file of ['singles-championship.js','team-event-roster.js'])await cp(resolve(root,file),resolve(out,'functions',file));
for(const file of ['index.mjs','adapter.mjs','state.mjs'])await cp(resolve(here,file),resolve(out,'functions/firebase-qa',file));
const sandbox=JSON.parse(await readFile(resolve(root,'sandbox/package.json'),'utf8'));
await writeFile(resolve(out,'functions/package.json'),JSON.stringify({name:'dove-full-firebase-qa',private:true,type:'module',main:'firebase-qa/index.mjs',engines:{node:'22'},dependencies:{...sandbox.dependencies,supertest:sandbox.devDependencies.supertest,'firebase-admin':'^13.0.0','firebase-functions':'^6.0.0'}},null,2));
await cp(resolve(here,'database.rules.json'),resolve(out,'database.rules.json'));
await writeFile(resolve(out,'.firebaserc'),JSON.stringify({projects:{default:'dovecupdatabase---qa'}}));
await writeFile(resolve(out,'firebase.json'),JSON.stringify({functions:[{source:'functions',codebase:'full-member-qa',runtime:'nodejs22',ignore:['node_modules','.git','*debug.log']}],database:{rules:'database.rules.json'},hosting:{site:'dovecupdatabase---qa',public:'web',ignore:['firebase.json','**/.*'],redirects:[{source:'/live.html',destination:'/courts.html',type:302}],rewrites:[{source:'/api/**',function:{functionId:'memberQA',region:'us-central1'}}],headers:[{source:'**/*.html',headers:[{key:'Cache-Control',value:'no-cache'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]},{source:'/staging/**',headers:[{key:'Cache-Control',value:'no-cache'}]}]}},null,2));
const config=JSON.parse(await readFile(resolve(out,'firebase.json'),'utf8'));
config.hosting.headers.unshift({source:'**',headers:[
  {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'"},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'same-origin'},
  {key:'X-Robots-Tag',value:'noindex, nofollow'}
]});
await writeFile(resolve(out,'firebase.json'),JSON.stringify(config,null,2));
console.log('Built isolated full QA in firebase-qa/dist. No deployment or database writes performed.');
