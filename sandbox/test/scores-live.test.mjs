import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {readFileSync} from 'node:fs';
import {createApp} from '../server.mjs';
const source=readFileSync(new URL('../live-signup/scores.html',import.meta.url),'utf8');
test('attendance page retains live CSS and public panels while disabling production startup',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());
  const html=(await request(app).get('/scores.html').expect(200)).text;
  assert.equal(html.match(/<style>([\s\S]*?)<\/style>/)[1],source.match(/<style>([\s\S]*?)<\/style>/)[1]);
  assert.equal(html.slice(html.indexOf('<main'),html.indexOf('</main>')),source.slice(source.indexOf('<main'),source.indexOf('</main>')));
  assert.match(html,/scores-live-runtime.js/);assert.ok(!html.includes('gstatic.com/firebasejs'));
  assert.ok(!/\nstart\(\);\s*<\/script>/.test(html));
});
test('attendance screen uses stable account IDs and actual check-in, not signup or matching display names',async t=>{
  const {app,domain}=await createApp({test:true});t.after(()=>domain.close());
  const first=(await request(app).get('/api/attendance-page').expect(200)).body;
  assert.equal(Object.keys(first.scoreData.players).length,0);
  assert.equal(first.signupStates.mrtc.joined.length,1);assert.equal(first.signupStates['nyta-east'].joined.length,2);
  const admin=domain.get("SELECT id FROM members WHERE role='admin'").id,nina=domain.get("SELECT id FROM members WHERE username='nina_test'").id,vivi=domain.get("SELECT id FROM members WHERE username='vivi_test'").id;
  domain.run('UPDATE members SET display_name=? WHERE id=?','Nina · 测试',vivi);
  const attendance=domain.checkIn(admin,{eventId:'2026-11-07-nyta-east',memberId:nina});
  const current=(await request(app).get('/api/attendance-page')).body;
  assert.equal(Object.keys(current.scoreData.players).length,1);assert.equal(current.scoreData.players[nina].appearances,1);assert.equal(current.scoreData.players[vivi],undefined);
  assert.equal(current.signupStates['nyta-east'].joined.filter(p=>p.name==='Nina · 测试').length,2);
  assert.ok(!JSON.stringify(current).includes('phone_tail'));assert.ok(!JSON.stringify(current).includes('paymentAmount'));
  domain.reverseAttendance(admin,attendance.id);
  assert.equal(Object.keys((await request(app).get('/api/attendance-page')).body.scoreData.players).length,0);
});
