import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const data=resolve(dirname(fileURLToPath(import.meta.url)),'../.data/cloud-qa'),source=resolve(data,'members.sqlite');
if(!existsSync(source))throw Error('No cloud QA database exists. No backup was created.');
const out=resolve(data,'backups');mkdirSync(out,{recursive:true});const target=resolve(out,'members-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
const db=new DatabaseSync(source,{readOnly:true});try{await backup(db,target);console.log('Complete private SQLite backup: '+target);console.log('Download this file privately. Do not commit or publish it.');}finally{db.close();}
