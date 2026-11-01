import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { createApp } from '../server.mjs';
const source=readFileSync(new URL('../live-signup/signup.html',import.meta.url),'utf8');
async function login(app,username){const agent=request.agent(app),boot=await agent.get('/api/bootstrap');const result=await agent.post('/api/auth/login').set('X-CSRF-Token',boot.body.csrf).send({username,password:'DoveTest!2026'}).expect(200);return {agent,csrf:result.body.csrf};}
test('test signup retains the exact live style and list/modal markup, without production connections',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());const page=(await request(app).get('/signup.html').expect(200)).text;
  assert.equal(page.match(/<style>([\s\S]*?)<\/style>/)[1],source.match(/<style>([\s\S]*?)<\/style>/)[1]);
  const section=html=>html.slice(html.indexOf('<!-- Tabs -->'),html.indexOf('<!-- FAB -->'));
  assert.equal(section(page),section(source));
  assert.match(page,/signup-live-runtime.js/);assert.ok(!page.includes('gstatic.com/firebasejs'));
  assert.ok(!page.includes('initRealtimeDatabase();\n</script>'));
  assert.match((await request(app).get('/venue-config.js')).text,/capacity: 24/);
  await request(app).get('/api/signup/2026-11-07-nyta-east').expect(200);
  await request(app).get('/api/team').expect(200);
});
test('live-style signup confirms only the owner, keeps attendance separate and protects phone changes',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());const nina=await login(app,'nina_test'),vivi=await login(app,'vivi_test');
  const endpoint='/api/signup/2026-11-07-nyta-east';const before=(await nina.agent.get(endpoint)).body;
  assert.equal(before.state.capacity,12);assert.equal(before.state.joined.length,2);assert.ok(Number.isInteger(before.state.joined[0].id));
  const mine=before.state.joined.find(p=>p.name==='Nina · 测试');assert.ok(mine.ownerKey);assert.equal(before.state.joined.find(p=>p.name==='Vivi · 测试').ownerKey,'');
  await vivi.agent.patch('/api/signup/bookings/'+mine.bookingId+'/confirmation').set('X-CSRF-Token',vivi.csrf).send({confirmed:true}).expect(403);
  await nina.agent.patch('/api/signup/bookings/'+mine.bookingId+'/confirmation').set('X-CSRF-Token',nina.csrf).send({confirmed:true}).expect(200);
  assert.equal((await nina.agent.get(endpoint)).body.state.joined.find(p=>p.bookingId===mine.bookingId).confirmed,true);
  assert.equal(domain.get('SELECT COUNT(*) n FROM attendance').n,0);
  await vivi.agent.patch('/api/signup/bookings/'+mine.bookingId+'/phone-tail').set('X-CSRF-Token',vivi.csrf).send({phoneTail:'9999'}).expect(403);
  await nina.agent.patch('/api/signup/bookings/'+mine.bookingId+'/phone-tail').set('X-CSRF-Token',nina.csrf).send({phoneTail:'0123'}).expect(200);
  assert.equal((await nina.agent.get('/api/me')).body.user.phoneTail,'0123');
});
test('explicit waitlist signup and authorized shared package preserve member and payment identity',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());const nina=await login(app,'nina_test'),vivi=await login(app,'vivi_test');
  const booking=(await vivi.agent.post('/api/bookings').set('X-CSRF-Token',vivi.csrf).send({eventId:'2026-11-14-mrtc',level:'25_30',paymentMode:'single',preferWaitlist:true}).expect(201)).body;
  assert.equal(booking.status,'waitlist');
  const pkg=(await nina.agent.get('/api/me')).body.packages[0];
  await vivi.agent.post('/api/signup/bookings/'+booking.id+'/package').set('X-CSRF-Token',vivi.csrf).send({packageId:pkg.id}).expect(200);
  const item=(await vivi.agent.get('/api/signup/2026-11-14-mrtc')).body.state.waitlist[0];assert.equal(item.paymentStatus,'package_pending');
  assert.equal(domain.balance(pkg.id),10);assert.equal(domain.get('SELECT COUNT(*) n FROM attendance').n,0);
});
