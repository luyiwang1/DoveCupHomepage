import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDomain, publicMember } from '../domain.mjs';
async function fixture(t){const d=await createDomain();t.after(()=>d.close());const users=Object.fromEntries(d.all('SELECT * FROM members').map(m=>[m.username,m]));return {d,admin:users.admin_test,nina:users.nina_test,vivi:users.vivi_test,irene:users.irene_test};}
function addMember(d,name){const template=d.get("SELECT * FROM members WHERE username='nina_test'"),memberId=randomUUID();d.run('INSERT INTO members(id,username,display_name,phone_tail,password_hash,recovery_hash,role,created_at) VALUES(?,?,?,?,?,?,?,?)',memberId,name,name,'1234',template.password_hash,template.recovery_hash,'member',new Date().toISOString());return memberId;}

test('fixed member identity survives login; duplicate usernames and privilege injection are rejected',async t=>{
  const {d}=await fixture(t);const registered=await d.register({username:'new_player',displayName:'Nina · 测试',phoneTail:'0012',password:'LongTest!2026',role:'admin'});
  assert.equal(registered.user.role,'member');assert.equal(registered.user.phoneTail,'0012');
  const login=await d.authenticate('new_player','LongTest!2026');assert.equal(login.id,registered.user.id);
  assert.equal(publicMember(d.member(login.id)).password_hash,undefined);
  await assert.rejects(d.register({username:'new_player',displayName:'Other',phoneTail:'9999',password:'LongTest!2026'}),e=>e.code==='username_taken');
  await assert.rejects(d.authenticate('new_player','wrong'),e=>e.code==='login_failed');
  await assert.rejects(d.register({username:'short_pw',displayName:'Other',phoneTail:'1234',password:'123'}),e=>e.code==='password_length');
});
test('registration uses one name while preserving existing separate display names',async t=>{
  const {d,nina}=await fixture(t);
  const result=await d.register({username:'New_Player',phoneTail:'0012',password:'LongTest!2026'});
  assert.equal(result.user.username,'new_player');
  assert.equal(result.user.displayName,'New_Player');
  assert.equal((await d.authenticate('NEW_PLAYER','LongTest!2026')).id,result.user.id);
  assert.equal(d.member(nina.id).display_name,'Nina · 测试');
  await assert.rejects(d.register({username:'new_player',phoneTail:'0012',password:'LongTest!2026'}),e=>e.code==='username_taken');
});

test('Nina and Vivi share one package; separate attendance, reversal, refunds and receipt idempotency',async t=>{
  const {d,admin,nina,vivi}=await fixture(t);const pkg=d.profile(nina.id).packages[0],eventId='2026-11-07-nyta-east';
  const payment=d.profile(nina.id).payments[0];d.verifyPayment(admin.id,payment.id);assert.equal(d.adminData(admin.id).ledger.filter(x=>x.kind==='payment').length,1);
  const first=d.checkIn(admin.id,{eventId,memberId:nina.id,packageId:pkg.id});
  assert.equal(d.checkIn(admin.id,{eventId,memberId:nina.id,packageId:pkg.id}).id,first.id);
  const second=d.checkIn(admin.id,{eventId,memberId:vivi.id,packageId:pkg.id});
  assert.equal(d.balance(pkg.id),8);assert.equal(d.profile(nina.id).attended,1);assert.equal(d.profile(vivi.id).attended,1);
  assert.equal(d.profile(nina.id).received,35000);assert.equal(d.profile(vivi.id).received,0);
  assert.equal(d.profile(vivi.id).packages[0].isOwner,false);
  assert.throws(()=>d.refund(admin.id,payment.id),e=>e.code==='package_used');
  d.reverseAttendance(admin.id,second.id);d.reverseAttendance(admin.id,second.id);assert.equal(d.balance(pkg.id),9);
  assert.equal(d.profile(vivi.id).attended,0);d.reverseAttendance(admin.id,first.id);assert.equal(d.balance(pkg.id),10);
  d.refund(admin.id,payment.id);d.refund(admin.id,payment.id);assert.equal(d.balance(pkg.id),0);assert.equal(d.profile(nina.id).received,0);
  assert.equal(d.profile(nina.id).packages[0].used,0);
});
test('sharing requires owner/admin authorization and revoked grants stop future usage',async t=>{
  const {d,admin,nina,vivi,irene}=await fixture(t);const pkg=d.profile(nina.id).packages[0];
  assert.throws(()=>d.share(vivi.id,pkg.id,'irene_test'),e=>e.code==='package_forbidden');
  assert.throws(()=>d.book(irene.id,{eventId:'2026-11-14-nyta-east',level:'u20',paymentMode:'use_package',packageId:pkg.id}),e=>e.code==='package_forbidden');
  d.share(nina.id,pkg.id,'vivi_test',false);
  assert.throws(()=>d.checkIn(admin.id,{eventId:'2026-11-07-nyta-east',memberId:vivi.id,packageId:pkg.id}),e=>e.code==='package_forbidden');
  assert.equal(d.balance(pkg.id),10);assert.equal(d.profile(vivi.id).packages.length,0);
});
test('NYTA divisions cap at four and total twelve; eligible waitlist promotion preserves bookings',async t=>{
  const {d}=await fixture(t),eventId='2026-11-14-nyta-east',members=[];
  for(let i=0;i<13;i++)members.push(addMember(d,`capacity_${i}`));
  const b=[];for(let i=0;i<5;i++)b.push(d.book(members[i],{eventId,level:'u20',paymentMode:'single'}));
  assert.equal(b[4].status,'waitlist');
  for(let i=5;i<13;i++)d.book(members[i],{eventId,level:i<9?'25_30':'30_plus',paymentMode:'single'});
  const e=d.events().find(e=>e.id===eventId);assert.equal(e.joined,12);assert.equal(e.waiting,1);
  const extra=addMember(d,'capacity_extra'),waiting=d.book(extra,{eventId,level:'35_plus',paymentMode:'single'});assert.equal(waiting.status,'waitlist');
  d.cancel(members[5],d.get('SELECT id FROM bookings WHERE member_id=?',members[5]).id);
  assert.equal(d.get('SELECT status FROM bookings WHERE id=?',waiting.id).status,'joined');
  assert.equal(d.get('SELECT status FROM bookings WHERE id=?',b[4].id).status,'waitlist');
  d.cancel(members[0],b[0].id);assert.equal(d.get('SELECT status FROM bookings WHERE id=?',b[4].id).status,'joined');
});
test('ordinary members cannot edit other registrations or confirm payments',async t=>{
  const {d,nina,vivi,irene}=await fixture(t),nb=d.profile(nina.id).bookings[0];
  assert.throws(()=>d.cancel(vivi.id,nb.id),e=>e.code==='not_owner');
  assert.throws(()=>d.updateBooking(vivi.id,nb.id,{level:'35_plus'}),e=>e.code==='not_owner');
  assert.throws(()=>d.verifyPayment(nina.id,d.profile(irene.id).payments[0].id),e=>e.code==='admin_required');
  assert.equal(d.profile(nina.id).bookings[0].status,'joined');
});
test('pending payments do not credit money or visits; admin correction does not imply verification',async t=>{
  const {d,admin,irene}=await fixture(t),p=d.profile(irene.id).payments[0];
  assert.equal(d.profile(irene.id).received,0);assert.equal(d.profile(irene.id).packages.length,0);
  d.correctPayment(admin.id,p.id,'package10');assert.equal(d.profile(irene.id).payments[0].amount_cents,35000);assert.equal(d.profile(irene.id).received,0);
  d.verifyPayment(admin.id,p.id);assert.equal(d.profile(irene.id).received,35000);assert.equal(d.profile(irene.id).packages[0].remaining,10);
});
test('legacy records never auto-link by same name or phone ending; admin verifies each claim',async t=>{
  const {d,admin,nina,vivi}=await fixture(t);const claim=d.claim(vivi.id,'legacy-demo-01');
  d.claim(nina.id,'legacy-demo-01');assert.equal(d.profile(vivi.id).bookings.length,1);
  assert.throws(()=>d.approveClaim(vivi.id,claim.id,true),e=>e.code==='admin_required');
  d.approveClaim(admin.id,claim.id,true);assert.equal(d.profile(vivi.id).bookings.length,2);
  assert.equal(d.profile(vivi.id).bookings.find(b=>b.event_id==='2026-11-14-mrtc').created_at,'2026-10-20T18:00:00.000Z');
  assert.equal(d.profile(nina.id).claims[0].status,'rejected');
  assert.equal(d.profile(vivi.id).attended,0);
});
test('recovery codes are one-time and do not use display names or phone endings as passwords',async t=>{
  const {d}=await fixture(t);const created=await d.register({username:'recover_user',displayName:'Recovery',phoneTail:'1234',password:'Original!2026'});
  await assert.rejects(d.recover('recover_user','1234','ChangedTest!2026'),e=>e.code==='recovery_failed');
  const recovered=await d.recover('recover_user',created.recoveryCode,'ChangedTest!2026');assert.equal(recovered.user.id,created.user.id);
  await assert.rejects(d.recover('recover_user',created.recoveryCode,'AnotherTest!2026'),e=>e.code==='recovery_failed');
  await assert.rejects(d.authenticate('recover_user','Original!2026'));
  assert.equal((await d.authenticate('recover_user','ChangedTest!2026')).id,created.user.id);
});
