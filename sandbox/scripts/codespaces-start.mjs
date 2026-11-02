import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync,readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.env.CODESPACES!=='true')throw Error('Run this only in a GitHub Codespace');
const here=resolve(dirname(fileURLToPath(import.meta.url)),'..'),data=resolve(here,'.data/cloud-qa');
try{const r=await fetch('http://127.0.0.1:4187/_qa/health',{signal:AbortSignal.timeout(1500)});if((await r.json()).environment==='isolated-member-sandbox'){console.log('Full QA is already running on port 4187');process.exit(0);}}catch{}
mkdirSync(data,{recursive:true});const output=openSync(resolve(data,'server.log'),'a',0o600);
const child=spawn(process.execPath,['server.mjs'],{cwd:here,env:{...process.env,PORT:'4187',DOVE_QA_CODESPACES:'1',DOVE_SANDBOX_DATA:data,NODE_ENV:'development'},detached:true,stdio:['ignore',output,output]});child.unref();closeSync(output);
let ready=false;for(let attempt=0;attempt<30;attempt++){await new Promise(r=>setTimeout(r,500));try{const r=await fetch('http://127.0.0.1:4187/_qa/health',{signal:AbortSignal.timeout(1000)});if((await r.json()).ready){ready=true;break;}}catch{}}
if(!ready)throw Error('QA startup failed. Inspect sandbox/.data/cloud-qa/server.log');
console.log(`Full QA: https://${process.env.CODESPACE_NAME}-4187.app.github.dev/`);
console.log('The port stays private until the owner explicitly changes its visibility.');
if(existsSync(resolve(data,'owner-setup-code')))console.log('Private first-owner setup code is in sandbox/.data/cloud-qa/owner-setup-code. Never commit or share it.');
