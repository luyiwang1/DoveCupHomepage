import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret,defineString} from 'firebase-functions/params';
import {initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {createCloudAdapter} from './adapter.mjs';
import {firebaseStore} from './state.mjs';

const PROJECT='dovecupdatabase---qa';
const sessionSecret=defineSecret('DOVE_QA_SESSION_SECRET');
const importSecret=defineSecret('DOVE_QA_IMPORT_SECRET');
const databaseURL=defineString('DOVE_QA_DATABASE_URL');
let api;
export const memberQA=onRequest({region:'us-central1',minInstances:0,maxInstances:1,concurrency:1,memory:'512MiB',timeoutSeconds:60,secrets:[sessionSecret,importSecret],invoker:'public'},(req,res)=>{
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT;
  if(project!==PROJECT)return res.status(503).json({error:'qa_project_mismatch'});
  if(!api){
    const url=new URL(databaseURL.value());
    if(url.protocol!=='https:'||!/^dovecupdatabase---qa(?:-default-rtdb)?(?:\.[a-z0-9-]+)?\.(?:firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname))return res.status(503).json({error:'qa_database_mismatch'});
    const app=initializeApp({projectId:PROJECT,databaseURL:url.origin});
    api=createCloudAdapter({store:firebaseStore(getDatabase(app)),secret:sessionSecret.value(),importSecret:importSecret.value()});
  }
  return api(req,res);
});
