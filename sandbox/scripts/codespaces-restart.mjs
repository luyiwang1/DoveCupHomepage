import {readdirSync,readFileSync,readlinkSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.env.CODESPACES!=='true'||process.platform!=='linux')throw Error('Run only inside the QA Codespace');
const here=resolve(dirname(fileURLToPath(import.meta.url)),'..'),target=resolve(here,'server.mjs'),matches=[];
for(const pid of readdirSync('/proc').filter(p=>/^\d+$/.test(p))){try{const proc='/proc/'+pid;if(statSync(proc).uid!==process.getuid())continue;const args=readFileSync(proc+'/cmdline','utf8').split('\0').filter(Boolean),cwd=readlinkSync(proc+'/cwd');if(args[0]===process.execPath&&args[1]&&resolve(cwd,args[1])===target&&cwd===here)matches.push(Number(pid));}catch{}}
if(matches.length>1)throw Error('More than one matching QA server found; refusing an ambiguous restart');
if(matches.length===1){process.kill(matches[0],'SIGTERM');let stopped=false;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,300));try{await fetch('http://127.0.0.1:4187/_qa/health',{signal:AbortSignal.timeout(500)});}catch{stopped=true;break;}}if(!stopped)throw Error('QA did not stop gracefully. No forced termination was attempted.');}
await import('./codespaces-start.mjs');
