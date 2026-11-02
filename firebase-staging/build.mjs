import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {firebaseConfig} from './web/config.js';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..'),out=resolve(here,'dist');
if(firebaseConfig.projectId!=='dovecupdatabase---qa')throw Error('Refusing a non-QA project');
await mkdir(resolve(out,'assets/home'),{recursive:true});
for(const file of ['index.html','app.mjs','finance.mjs','config.js','qa.css'])await copyFile(resolve(here,'web',file),resolve(out,file));
for(const file of ['app.css','profile.css','admin.css']){const css=await readFile(resolve(root,'sandbox/public',file),'utf8');await writeFile(resolve(out,file),css.replaceAll("'/assets/","'./assets/"));}
await copyFile(resolve(root,'assets/home/invitation-court-02.jpg'),resolve(out,'assets/home/invitation-court-02.jpg'));
await copyFile(resolve(root,'golden-dove-mark.webp'),resolve(out,'golden-dove-mark.webp'));
await copyFile(resolve(here,'spark.rules'),resolve(out,'spark.rules'));
await writeFile(resolve(out,'.nojekyll'),'');
for(const alias of ['account.html','finance.html','login.html'])await copyFile(resolve(out,'index.html'),resolve(out,alias));
console.log('Built isolated Firebase Spark QA site at '+out);
