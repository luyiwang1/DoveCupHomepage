import {doc,runTransaction,serverTimestamp} from 'firebase/firestore';
export function validateDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('invalid_date');return date;}
const check=(ok,message)=>{if(!ok)throw Error(message);};
const row=s=>s.exists()?{id:s.id,...s.data()}:null;
function entry(actor,kind,member,amount,visits,extra={}){return {kind,member_id:member,owner_id:extra.owner_id||member,amount_cents:amount,visits,actor_id:actor,created_at:serverTimestamp(),payment_id:null,package_id:null,attendance_id:null,...extra};}
export async function verifyPayment(db,actor,id){return runTransaction(db,async tx=>{
  const ref=doc(db,'payments',id),p=row(await tx.get(ref));check(p,'payment_missing');if(p.status==='received')return false;check(p.status==='pending','payment_not_pending');
  const receipt=doc(db,'ledger','receipt_'+id),existing=await tx.get(receipt);check(!existing.exists(),'duplicate_receipt');
  tx.update(ref,{status:'received',verified_at:serverTimestamp(),verified_by:actor});
  if(p.plan==='package10')tx.set(doc(db,'packages',id),{owner_id:p.member_id,payment_id:id,remaining:10,access_uids:[p.member_id],created_at:serverTimestamp(),last_entry:'receipt_'+id});
  tx.set(receipt,entry(actor,'payment',p.member_id,p.amount_cents,p.plan==='package10'?10:0,{payment_id:id,package_id:p.plan==='package10'?id:null}));return true;
});}
export async function correctPayment(db,id,plan){check(['single','package10'].includes(plan),'invalid_plan');return runTransaction(db,async tx=>{const ref=doc(db,'payments',id),p=row(await tx.get(ref));check(p?.status==='pending','payment_not_pending');tx.update(ref,{plan,amount_cents:plan==='single'?4000:35000});});}
export async function sharePackage(db,id,memberId,active){return runTransaction(db,async tx=>{
  const ref=doc(db,'packages',id),p=row(await tx.get(ref)),member=await tx.get(doc(db,'members',memberId));check(p&&member.exists(),'member_missing');check(p.remaining>0,'no_visits');check(memberId!==p.owner_id,'invalid_share');
  const access=new Set(p.access_uids);if(active)access.add(memberId);else access.delete(memberId);check(access.size<=20,'too_many_shares');tx.update(ref,{access_uids:[...access]});
});}
export async function checkIn(db,actor,{memberId,date,venue,packageId=null,paymentId=null}){
  validateDate(date);check(['mrtc','nyta-east'].includes(venue),'invalid_venue');check(!!packageId!==!!paymentId,'select_payment');
  const id=[date,venue,memberId].join('_');
  return runTransaction(db,async tx=>{
    const ref=doc(db,'attendance',id),previous=row(await tx.get(ref)),member=await tx.get(doc(db,'members',memberId));check(member.exists(),'member_missing');if(previous&&!previous.reversed)return false;
    let pkg=null,payment=null,useRef=null;
    if(packageId){pkg=row(await tx.get(doc(db,'packages',packageId)));check(pkg?.access_uids.includes(memberId),'package_forbidden');check(pkg.remaining>0,'no_visits');}
    else{payment=row(await tx.get(doc(db,'payments',paymentId)));useRef=doc(db,'singleUses',paymentId);const use=row(await tx.get(useRef));check(payment?.status==='received'&&payment.plan==='single'&&payment.member_id===memberId,'payment_not_verified');check(payment.date===date&&payment.venue===venue,'payment_session_mismatch');check(!use||!use.active,'single_already_used');}
    const revision=(previous?.revision||0)+1,key='visit_'+id+'_'+revision,owner=pkg?.owner_id||memberId;
    tx.set(ref,{member_id:memberId,owner_id:owner,package_id:packageId,payment_id:paymentId,date,venue,revision,reversed:false,created_at:serverTimestamp(),last_entry:key});
    if(pkg)tx.update(doc(db,'packages',packageId),{remaining:pkg.remaining-1,last_entry:key});
    if(useRef)tx.set(useRef,{active:true,attendance_id:id});
    tx.set(doc(db,'ledger',key),entry(actor,pkg?'usage':'attendance',memberId,0,pkg?-1:0,{owner_id:owner,package_id:packageId,payment_id:paymentId,attendance_id:id}));return true;
  });
}
export async function reverseAttendance(db,actor,id){return runTransaction(db,async tx=>{
  const ref=doc(db,'attendance',id),a=row(await tx.get(ref));check(a,'attendance_missing');if(a.reversed)return false;
  const pkg=a.package_id?row(await tx.get(doc(db,'packages',a.package_id))):null;check(!pkg||pkg.remaining<10,'invalid_balance');
  const key='reverse_'+id+'_'+a.revision;tx.update(ref,{reversed:true,last_entry:key});
  if(pkg)tx.update(doc(db,'packages',a.package_id),{remaining:pkg.remaining+1,last_entry:key});
  if(a.payment_id)tx.set(doc(db,'singleUses',a.payment_id),{active:false,attendance_id:id});
  tx.set(doc(db,'ledger',key),entry(actor,'reversal',a.member_id,0,pkg?1:0,{owner_id:a.owner_id,package_id:a.package_id,payment_id:a.payment_id,attendance_id:id}));return true;
});}
export async function refundPayment(db,actor,id){return runTransaction(db,async tx=>{
  const ref=doc(db,'payments',id),p=row(await tx.get(ref));check(p,'payment_missing');if(p.status==='refunded')return false;check(p.status==='received','payment_not_verified');
  let pkg=null;if(p.plan==='package10'){pkg=row(await tx.get(doc(db,'packages',id)));check(pkg?.remaining===10,'package_used');}else{const use=row(await tx.get(doc(db,'singleUses',id)));check(!use?.active,'single_already_used');}
  const key='refund_'+id;check(!(await tx.get(doc(db,'ledger',key))).exists(),'duplicate_refund');tx.update(ref,{status:'refunded',refunded_at:serverTimestamp()});if(pkg)tx.update(doc(db,'packages',id),{remaining:0,last_entry:key});
  tx.set(doc(db,'ledger',key),entry(actor,'refund',p.member_id,-p.amount_cents,pkg?-10:0,{payment_id:id,package_id:pkg?id:null}));return true;
});}
