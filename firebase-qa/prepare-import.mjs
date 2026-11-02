import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDomain} from '../sandbox/domain.mjs';
import {createOperations} from '../sandbox/operations.mjs';
import {dumpState,restoreState,TABLES} from './state.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(root,'sandbox/.data/cloud-qa/members.sqlite');
if(!existsSync(source))throw Error('Run this on the existing Codespace. No QA database found.');
const old=new DatabaseSync(source,{readOnly:true}),domain=await createDomain(':memory:',{seed:false});createOperations(domain);
try{
  old.exec('BEGIN');
  const tables=Object.fromEntries(TABLES.map(t=>[t,t==='sessions'?[]:old.prepare(`SELECT rowid AS __rowid,* FROM ${t} ORDER BY rowid`).all()]));
  const state={schema:1,payload:JSON.stringify(tables)};restoreState(domain,state);
  const owner=domain.get("SELECT id,username FROM members WHERE role='admin' AND deleted_at IS NULL");
  if(owner?.username!=='王鸽'||domain.get("SELECT COUNT(*) n FROM members WHERE role='admin'").n!==1)throw Error('Expected Wang Ge as the unique QA administrator. Review before import.');
  const out=resolve(root,'firebase-qa/private');mkdirSync(out,{recursive:true});
  const file=resolve(out,`qa-import-${Date.now()}.json`);
  writeFileSync(file,JSON.stringify({...dumpState(domain,{sessions:false}),revision:1,updatedAt:Date.now()}),{flag:'wx',mode:0o600});
  console.log('Private import prepared:',file);console.log('Retains member IDs, password hashes, roles, registrations and financial records. Sessions excluded.');
  console.log('Not uploaded. Do not commit, publish, paste into chat, or overwrite an existing cloud state.');
}finally{old.close();domain.close();}
