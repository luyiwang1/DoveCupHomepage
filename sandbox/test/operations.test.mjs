import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server.mjs';
import { createOperations } from '../operations.mjs';
async function login(app,username){const a=request.agent(app),b=await a.get('/api/bootstrap');const r=await a.post('/api/auth/login').set('X-CSRF-Token',b.body.csrf).send({username,password:'DoveTest!2026'}).expect(200);return {a,csrf:r.body.csrf,id:r.body.user.id};}
test('court layouts are isolated by session and venue, admin-only and revision-protected',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());const admin=await login(app,'admin_test'),member=await login(app,'nina_test');
  const path='/api/events/2026-11-07-nyta-east/courts';
  const roster=(await request(app).get('/api/events/2026-11-07-nyta-east/court-roster').expect(200)).body;
  assert.equal(roster.state.joined.length,2);assert.ok(!JSON.stringify(roster).includes('phone_tail'));
  await member.a.put(path).set('X-CSRF-Token',member.csrf).send({revision:0,data:{courtCount:3}}).expect(403);
  await admin.a.put(path).set('X-CSRF-Token',admin.csrf).send({revision:0,data:{courtCount:3,roundScores:{'0-0':{a:6,b:4}}}}).expect(200);
  await admin.a.put(path).set('X-CSRF-Token',admin.csrf).send({revision:0,data:{courtCount:4}}).expect(409);
  assert.equal((await request(app).get(path)).body.data.courtCount,3);
  assert.equal((await request(app).get('/api/events/2026-11-14-nyta-east/courts')).body.data,null);
  assert.equal((await request(app).get('/api/events/2026-11-07-mrtc/courts')).body.data,null);
  const html=(await request(app).get('/courts.html?venue=nyta-east').expect(200)).text;
  assert.match(html,/courts-bridge.js/);assert.ok(!html.includes('gstatic.com/firebasejs'));
});
test('public attendance counts actual check-in only and reversals disappear without exposing money',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());const admin=await login(app,'admin_test'),nina=await login(app,'nina_test');
  assert.equal((await request(app).get('/api/attendance')).body.records.length,0);
  const record=domain.checkIn(admin.id,{eventId:'2026-11-07-nyta-east',memberId:nina.id});
  const view=(await request(app).get('/api/attendance?venue=nyta-east')).body;
  assert.equal(view.players[0].visits,1);assert.equal(view.records.length,1);assert.ok(!JSON.stringify(view).includes('amount'));
  domain.reverseAttendance(admin.id,record.id);assert.equal((await request(app).get('/api/attendance')).body.records.length,0);
});
test('singles registration is bound to member identity and cannot edit another member or results',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());const nina=await login(app,'nina_test'),vivi=await login(app,'vivi_test'),admin=await login(app,'admin_test');
  const first=await nina.a.post('/api/singles').set('X-CSRF-Token',nina.csrf).send({action:'join',division:'women',revision:0,name:'Spoofed'}).expect(200);
  const entry=first.body.data.registration.entries[0];assert.equal(entry.name,'Nina · 测试');assert.equal(entry.ownerKey,nina.id);
  await vivi.a.post('/api/singles').set('X-CSRF-Token',vivi.csrf).send({action:'remove',id:entry.id,revision:1}).expect(403);
  await nina.a.post('/api/singles').set('X-CSRF-Token',nina.csrf).send({action:'admin',revision:1,data:first.body.data}).expect(403);
  assert.equal((await request(app).get('/api/singles')).body.data.registration.entries[0].ownerKey,'');
  assert.equal((await admin.a.get('/api/singles')).body.data.registration.entries[0].ownerKey,nina.id);
});
test('team signup protects other members and archived event data is immutable',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());const nina=await login(app,'nina_test'),vivi=await login(app,'vivi_test'),admin=await login(app,'admin_test');
  const base=(await nina.a.get('/api/team')).body;
  const entry={id:'nina-team',name:'Nina · 测试',ownerKey:nina.id,team:'phoenix',gender:'female',signupMode:'single',joinedAt:1};
  await nina.a.put('/api/team').set('X-CSRF-Token',nina.csrf).send({revision:0,data:{...base.data,registrations:[entry]}}).expect(200);
  const viewed=(await vivi.a.get('/api/team')).body;assert.equal(viewed.data.registrations[0].ownerKey,'');
  await vivi.a.put('/api/team').set('X-CSRF-Token',vivi.csrf).send({revision:1,data:{...viewed.data,registrations:[]}}).expect(403);
  const full=(await admin.a.get('/api/team')).body;
  await admin.a.put('/api/team').set('X-CSRF-Token',admin.csrf).send({revision:1,data:{...full.data,status:'archived'}}).expect(200);
  await admin.a.put('/api/team').set('X-CSRF-Token',admin.csrf).send({revision:2,data:full.data}).expect(409);
  for(const page of ['/team-event.html','/singles-championship.html']){const html=(await request(app).get(page).expect(200)).text;assert.ok(!html.includes('gstatic.com/firebasejs'));assert.match(html,/DoveSandboxReady/);}
});
test('Saturday 23:00 Toronto rollover preserves history without inventing attendance',async t=>{
  const {domain}=await createApp({test:true});t.after(()=>domain.close());const op=createOperations(domain);
  assert.equal(op.archiveDue(new Date('2026-11-08T03:59:00Z')).archived,0);
  assert.equal(op.archiveDue(new Date('2026-11-08T04:00:00Z')).archived,2);
  assert.equal(op.archiveDue(new Date('2026-11-08T04:01:00Z')).archived,0);
  assert.equal(domain.get("SELECT COUNT(*) n FROM attendance").n,0);
  assert.equal(domain.get("SELECT COUNT(*) n FROM bookings").n,3);
  assert.equal(domain.events().filter(e=>e.date==='2026-11-14').length,2);
});
