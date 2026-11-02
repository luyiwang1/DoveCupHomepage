import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,serverTimestamp} from 'firebase/firestore';
const projectId='demo-dovecup-qa';
const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080}});
for(const [email,name,admin] of [['qa-admin@example.invalid','QA Admin',true],['qa-member@example.invalid','QA Member',false]]){
  const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Test123!',returnSecureToken:true})});
  const result=await response.json();if(!response.ok)throw Error(result.error?.message||'Emulator seed failed');
  await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await setDoc(doc(db,'members',result.localId),{display_name:name,phone_tail:'1234',created_at:serverTimestamp(),updated_at:serverTimestamp()});if(admin)await setDoc(doc(db,'administrators',result.localId),{enabled:true});});
}
await env.cleanup();console.log('Seeded emulator-only UI accounts; no cloud writes.');
