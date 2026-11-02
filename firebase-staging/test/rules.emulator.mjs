import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,collection,getDocs,serverTimestamp} from 'firebase/firestore';
import {verifyPayment,correctPayment,sharePackage,checkIn,reverseAttendance,refundPayment} from '../web/finance.mjs';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-dovecup-qa',firestore:{rules:readFileSync(new URL('../spark.rules',import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await setDoc(doc(db,'administrators','admin'),{enabled:true});for(const id of ['admin','nina','vivi'])await setDoc(doc(db,'members',id),{display_name:id,phone_tail:'1234',created_at:serverTimestamp(),updated_at:serverTimestamp()});});});
const database=uid=>uid?env.authenticatedContext(uid).firestore():env.unauthenticatedContext().firestore();
async function submit(uid='nina',id='p1',plan='package10'){await setDoc(doc(database(uid),'payments',id),{member_id:uid,plan,amount_cents:plan==='single'?4000:35000,status:'pending',date:'2026-11-07',venue:'nyta-east',created_at:serverTimestamp()});}
test('guests cannot read private records; a member cannot grant admin or access another member',async()=>{
  await assertFails(getDoc(doc(database(),'members','nina')));await assertFails(getDoc(doc(database('vivi'),'members','nina')));
  await assertFails(setDoc(doc(database('nina'),'administrators','nina'),{enabled:true}));
  await assertFails(updateDoc(doc(database('admin'),'administrators','nina'),{enabled:true}));
  await assertFails(updateDoc(doc(database('nina'),'members','nina'),{role:'admin'}));
  await assertSucceeds(getDoc(doc(database('admin'),'members','nina')));
});
test('members create only their own fixed-price pending receipts and cannot verify or mint visits',async()=>{
  await submit();await assertFails(submit('vivi','p1'));
  await assertFails(updateDoc(doc(database('nina'),'payments','p1'),{status:'received'}));
  await assertFails(setDoc(doc(database('nina'),'packages','fake'),{remaining:100,owner_id:'nina'}));
  await assertFails(setDoc(doc(database('nina'),'payments','bad'),{member_id:'nina',plan:'package10',amount_cents:1,status:'pending',date:'2026-11-07',venue:'mrtc',created_at:serverTimestamp()}));
  await assertFails(verifyPayment(database('nina'),'nina','p1'));
});
test('verification credits exactly once, makes immutable receipts, and rejects unjournaled balance edits',async()=>{
  await submit();const db=database('admin');await verifyPayment(db,'admin','p1');await verifyPayment(db,'admin','p1');
  assert.equal((await getDoc(doc(db,'packages','p1'))).data().remaining,10);
  assert.equal((await getDocs(collection(db,'ledger'))).size,1);
  await assertFails(updateDoc(doc(db,'ledger','receipt_p1'),{amount_cents:1}));await assertFails(deleteDoc(doc(db,'ledger','receipt_p1')));
  await assertFails(updateDoc(doc(db,'packages','p1'),{remaining:9}));
  await assert.rejects(correctPayment(db,'p1','single'),/payment_not_pending/);
});
test('shared attendance charges the owner separately, deduplicates visits, and reverses once',async()=>{
  await submit();const db=database('admin');await verifyPayment(db,'admin','p1');await sharePackage(db,'p1','vivi',true);
  await assertSucceeds(getDoc(doc(database('vivi'),'packages','p1')));await assertFails(getDoc(doc(database('vivi'),'payments','p1')));
  for(const memberId of ['nina','vivi','vivi'])await checkIn(db,'admin',{memberId,date:'2026-11-07',venue:'nyta-east',packageId:'p1'});
  assert.equal((await getDoc(doc(db,'packages','p1'))).data().remaining,8);
  const visit=doc(db,'attendance','2026-11-07_nyta-east_vivi');assert.equal((await getDoc(visit)).data().owner_id,'nina');
  await reverseAttendance(db,'admin',visit.id);await reverseAttendance(db,'admin',visit.id);assert.equal((await getDoc(doc(db,'packages','p1'))).data().remaining,9);
  await assert.rejects(refundPayment(db,'admin','p1'),/package_used/);
});
test('concurrent attempts cannot spend the last shared visit twice; no negative balance',async()=>{
  await submit();const db=database('admin');await verifyPayment(db,'admin','p1');await sharePackage(db,'p1','vivi',true);
  for(let n=1;n<=9;n++)await checkIn(db,'admin',{memberId:'nina',date:'2026-10-'+String(n).padStart(2,'0'),venue:'mrtc',packageId:'p1'});
  const attempts=await Promise.allSettled(['nina','vivi'].map(memberId=>checkIn(db,'admin',{memberId,date:'2026-11-07',venue:'nyta-east',packageId:'p1'})));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal((await getDoc(doc(db,'packages','p1'))).data().remaining,0);
});
test('single visits use a matching received payment and refunds retain the original ledger',async()=>{
  await submit('nina','single','single');const db=database('admin');await verifyPayment(db,'admin','single');
  await assert.rejects(checkIn(db,'admin',{memberId:'nina',date:'2026-11-08',venue:'nyta-east',paymentId:'single'}),/payment_session_mismatch/);
  await checkIn(db,'admin',{memberId:'nina',date:'2026-11-07',venue:'nyta-east',paymentId:'single'});
  await assert.rejects(refundPayment(db,'admin','single'),/single_already_used/);
  await reverseAttendance(db,'admin','2026-11-07_nyta-east_nina');await refundPayment(db,'admin','single');await refundPayment(db,'admin','single');
  const rows=(await getDocs(collection(db,'ledger'))).docs.map(d=>d.data());assert.equal(rows.reduce((s,r)=>s+r.amount_cents,0),0);assert.equal(rows.filter(r=>r.kind==='refund').length,1);
});
