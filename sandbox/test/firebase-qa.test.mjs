import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createDomain} from '../domain.mjs';
import {createOperations} from '../operations.mjs';
import {createApp} from '../server.mjs';
import {dumpState,restoreState} from '../../firebase-qa/state.mjs';
import {createCloudAdapter,QA_ORIGINS} from '../../firebase-qa/adapter.mjs';

async function fixture(t){
  const domain=await createDomain();createOperations(domain);t.after(()=>domain.close());
  let current={...dumpState(domain),revision:1},conflicts=0,unavailable=false,attempts=0;
  const store={async read(){if(unavailable)throw Error('offline');return structuredClone(current);},async commit(revision,next){if(unavailable)throw Error('offline');if(conflicts-->0){current.revision++;return false;}if(revision!==current.revision)return false;current={...next,revision:revision+1};return true;},async allowAttempt(){return ++attempts<=100;}};
  const api=createCloudAdapter({store,secret:'isolated-test-secret-not-for-deployment-123456789',test:true});
  function client(){let cookie='',csrf='';return {async call(path,method='get',body){let call=request(api)[method]('/api'+path).set('Host',new URL(QA_ORIGINS[0]).host).set('Origin',QA_ORIGINS[0]);if(cookie)call.set('Cookie',cookie);if(csrf)call.set('x-csrf-token',csrf);const result=await (body?call.send(body):call);if(result.headers['set-cookie'])cookie=result.headers['set-cookie'].map(c=>c.split(';')[0]).join('; ');if(result.body.csrf)csrf=result.body.csrf;return result;}};}
  return {domain,api,client,state:()=>current,conflict(n){conflicts=n;},offline(){unavailable=true;}};
}

test('Firebase QA snapshot preserves identities, row IDs, money and shared balances without importing sessions',async t=>{
  const {domain}=await fixture(t),state=dumpState(domain,{sessions:false});
  const restored=await createDomain(':memory:',{seed:false});createOperations(restored);t.after(()=>restored.close());restoreState(restored,state);
  assert.deepEqual(dumpState(restored),state);
  const nina=domain.get("SELECT id FROM members WHERE username='nina_test'");
  assert.deepEqual(restored.profile(nina.id),domain.profile(nina.id));
  assert.deepEqual(createOperations(restored).signupState('2026-11-07-nyta-east'),createOperations(domain).signupState('2026-11-07-nyta-east'));
  const bad={...state,payload:JSON.stringify({...JSON.parse(state.payload),members:[]})};
  assert.throws(()=>restoreState(restored,bad),/references/);
  assert.deepEqual(dumpState(restored),state);
});

test('Firebase QA supports Chinese accounts, secure Hosting cookies and cross-instance login persistence',async t=>{
  const f=await fixture(t),first=f.client();
  assert.equal((await first.call('/bootstrap')).status,200);
  const registered=await first.call('/auth/register','post',{username:'王鸽',password:'abc123',phoneTail:'2910',role:'admin'});
  assert.equal(registered.status,201);assert.equal(registered.body.user.role,'member');
  assert.match(registered.headers['set-cookie'][0],/^__session=/);assert.match(registered.headers['set-cookie'][0],/HttpOnly/);assert.match(registered.headers['set-cookie'][0],/Secure/);
  assert.equal((await first.call('/me')).body.user.id,registered.body.user.id);
  const second=f.client();await second.call('/bootstrap');
  const logged=await second.call('/auth/login','post',{username:'王鸽',password:'abc123'});
  assert.equal(logged.status,200);assert.equal(logged.body.user.id,registered.body.user.id);
  assert.equal((await second.call('/admin')).status,403);
  const tables=JSON.parse(f.state().payload);assert.equal(tables.members.filter(m=>m.username==='王鸽').length,1);
  assert.ok(tables.sessions.length>=2);
});

test('Firebase QA persists admin receipts, separate shared attendance and idempotent deductions',async t=>{
  const f=await fixture(t),admin=f.client();await admin.call('/bootstrap');
  assert.equal((await admin.call('/auth/login','post',{username:'admin_test',password:'DoveTest!2026'})).status,200);
  const before=(await admin.call('/admin')).body;
  const nina=before.members.find(m=>m.username==='nina_test'),vivi=before.members.find(m=>m.username==='vivi_test');
  const pkg=before.packages.find(p=>p.owner_id===nina.id),payment=before.payments.find(p=>p.id===pkg.payment_id);
  const verify=()=>admin.call(`/admin/payments/${payment.id}/verify`,'post',{confirmed:true});
  assert.equal((await verify()).status,200);assert.equal((await verify()).status,200);
  for(const user of [nina,vivi]){
    const input={confirmed:true,eventId:'2026-11-07-nyta-east',memberId:user.id,packageId:pkg.id};
    assert.equal((await admin.call('/admin/attendance','post',input)).status,201);
    assert.equal((await admin.call('/admin/attendance','post',input)).status,201);
  }
  const after=(await admin.call('/admin')).body;
  assert.equal(after.packages.find(p=>p.id===pkg.id).remaining,8);
  assert.equal(after.ledger.filter(e=>e.kind==='payment').length,1);
  assert.equal(after.attendance.filter(a=>a.package_id===pkg.id).length,2);
});

test('Firebase QA conflicts retry before exposing results; failures never acknowledge unpersisted changes',async t=>{
  const f=await fixture(t),client=f.client();await client.call('/bootstrap');f.conflict(1);
  const registered=await client.call('/auth/register','post',{username:'重试会员',password:'abc123',phoneTail:'0012'});
  assert.equal(registered.status,201);
  assert.equal(JSON.parse(f.state().payload).members.filter(m=>m.username==='重试会员').length,1);
  f.offline();const failed=await client.call('/me');assert.equal(failed.status,503);assert.equal(failed.headers['set-cookie'],undefined);
});

test('Firebase QA concurrent shared-package requests cannot spend the final visit twice',async t=>{
  const f=await fixture(t),d=f.domain;
  const owner=d.get("SELECT id FROM members WHERE username='nina_test'"),guest=d.get("SELECT id FROM members WHERE username='vivi_test'"),actor=d.get("SELECT id FROM members WHERE username='admin_test'");
  const pkg=d.profile(owner.id).packages[0];
  d.run("INSERT INTO ledger(id,kind,member_id,package_id,visits,actor_id,created_at) VALUES(?,?,?,?,?,?,?)",'isolated-nine-previous-visits','usage',owner.id,pkg.id,-9,actor.id,new Date().toISOString());
  f.state().payload=dumpState(d).payload;
  const admin=f.client();await admin.call('/bootstrap');await admin.call('/auth/login','post',{username:'admin_test',password:'DoveTest!2026'});
  const input=memberId=>({confirmed:true,eventId:'2026-11-07-nyta-east',memberId,packageId:pkg.id});
  const first=admin.call('/admin/attendance','post',input(owner.id));
  const second=admin.call('/admin/attendance','post',input(guest.id));
  const results=[await first,await second];assert.equal(results.filter(r=>r.status===201).length,1);
  assert.equal(results.find(r=>r.status!==201).body.error,'no_visits');
  const data=(await admin.call('/admin')).body;assert.equal(data.packages.find(p=>p.id===pkg.id).remaining,0);
  assert.equal(data.attendance.filter(a=>a.package_id===pkg.id).length,1);
});

test('Firebase QA denies foreign hosts, cross-origin mutations and invalid public runtime configuration',async t=>{
  const f=await fixture(t);
  assert.equal((await request(f.api).get('/api/bootstrap').set('Host','dovecupdatabase.web.app')).status,403);
  const c=f.client();await c.call('/bootstrap');
  assert.equal((await request(f.api).post('/api/auth/register').set('Host',new URL(QA_ORIGINS[0]).host).set('Origin','https://evil.example').send({})).status,403);
  await assert.rejects(createApp({seed:false,publicOrigin:'https://dovecupdatabase.web.app',firebaseQA:true}),/isolated QA/);
  await assert.rejects(createApp({seed:true,publicOrigin:QA_ORIGINS[0],firebaseQA:true}),/must not seed/);
});

test('Firebase QA import requires a private secret, Wang Ge administrator and create-only cloud transaction',async t=>{
  const {domain}=await fixture(t);
  const wang=await domain.register({username:'王鸽',password:'abc123',phoneTail:'2910'});
  domain.run("UPDATE members SET role='member'");domain.run("UPDATE members SET role='admin' WHERE id=?",wang.user.id);
  let saved=null;
  const store={async allowAttempt(){return true;},async initialize(state){if(saved)return false;saved=state;return true;}};
  const token='private-import-secret-for-isolated-tests-only';
  const api=createCloudAdapter({store,secret:'private-session-secret-for-isolated-tests-only',importSecret:token,test:true});
  const send=body=>request(api).post('/api/qa-initialize').set('Host',new URL(QA_ORIGINS[0]).host).send(body);
  const state=dumpState(domain,{sessions:false});
  assert.equal((await send({token:'wrong',state})).status,403);assert.equal(saved,null);
  assert.equal((await send({token,state})).status,201);
  assert.equal((await send({token,state})).status,409);
  assert.equal(JSON.parse(saved.payload).members.find(m=>m.id===wang.user.id).role,'admin');
  assert.equal(JSON.parse(saved.payload).sessions.length,0);
});
