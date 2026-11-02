import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {readFileSync} from 'node:fs';
import {createApp} from '../server.mjs';
const origin='https://example-qa-4187.app.github.dev',host=new URL(origin).hostname;
const headers={'Host':host,'X-Forwarded-Proto':'https'};
test('hosted QA requires an exact HTTPS host, never seeds demo passwords and uses Secure HttpOnly sessions',async t=>{
  await assert.rejects(createApp({publicOrigin:'http://example-qa-4187.app.github.dev',seed:false}),/exact HTTPS/);
  await assert.rejects(createApp({publicOrigin:'https://attacker.example',seed:false}),/exact HTTPS/);
  await assert.rejects(createApp({publicOrigin:origin}),/must not seed/);
  const {app,domain}=await createApp({publicOrigin:origin,seed:false,test:true});t.after(()=>domain.close());
  assert.equal(domain.get('SELECT COUNT(*) n FROM members').n,0);
  assert.equal(domain.get('SELECT COUNT(*) n FROM ledger').n,0);
  await request(app).get('/api/bootstrap').set('Host',host).expect(426);
  await request(app).get('/api/bootstrap').set(headers).set('X-Forwarded-Host','attacker.example').expect(403);
  const boot=await request(app).get('/api/bootstrap').set(headers).expect(200);
  assert.match(boot.headers['set-cookie'][0],/HttpOnly/);assert.match(boot.headers['set-cookie'][0],/Secure/);assert.match(boot.headers['set-cookie'][0],/SameSite=Lax/);
  await request(app).get('/_qa/health').expect(200);
});
test('first owner setup requires private code and CSRF, and can create only one administrator',async t=>{
  const setupToken='random-test-private-code-12345678901234567890';
  const {app,domain}=await createApp({seed:false,publicOrigin:origin,ownerSetupToken:setupToken,test:true});t.after(()=>domain.close());
  const boot=await request(app).get('/api/bootstrap').set(headers).expect(200),cookie=boot.headers['set-cookie'][0].split(';')[0];
  const body={username:'wangge',password:'abc123',phoneTail:'0012',setupToken};
  const post=data=>request(app).post('/api/setup-owner').set(headers).set('Origin',origin).set('Cookie',cookie).set('X-CSRF-Token',boot.body.csrf).send(data);
  await request(app).post('/api/setup-owner').set(headers).send(body).expect(403);
  await post({...body,setupToken:'wrong'}).expect(403);
  await post({...body,setupToken:'非'.repeat(setupToken.length)}).expect(403);
  await request(app).post('/api/setup-owner').set(headers).set('Origin','https://attacker.example').set('Cookie',cookie).set('X-CSRF-Token',boot.body.csrf).send(body).expect(403);
  const results=await Promise.all([post(body),post({...body,username:'another'})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  const created=results.find(r=>r.status===201);assert.equal(created.body.user.role,'admin');assert.ok(created.body.recoveryCode);
  assert.equal(domain.get("SELECT COUNT(*) n FROM members WHERE role='admin'").n,1);
  assert.equal(domain.get('SELECT COUNT(*) n FROM ledger').n,0);
  const authCookie=created.headers['set-cookie'][0].split(';')[0];
  await request(app).get('/api/admin').set(headers).set('Cookie',authCookie).expect(200);
  await post({...body,username:'third'}).expect(409);
});
test('full hosted surface is the local application, with no Firebase email transport or new public admin password',async t=>{
  const {app,domain}=await createApp({seed:false,publicOrigin:origin,test:true});t.after(()=>domain.close());
  for(const path of ['/','/signup.html','/courts.html','/scores.html','/events.html','/moments.html','/singles-championship.html','/team-event.html','/account.html','/finance.html','/owner-setup.html']){
    const response=await request(app).get(path).set(headers).expect(200);assert.match(response.headers['content-security-policy'],/connect-src 'self'/);
    assert.doesNotMatch(response.text,/firebase-staging\/web|signInWithEmailAndPassword/);
  }
  const memberJs=(await request(app).get('/staging/app.js').set(headers).expect(200)).text;
  assert.match(memberJs,/name="username"/);assert.doesNotMatch(memberJs,/type="email"/);
  const config=JSON.parse(readFileSync(new URL('../../.devcontainer/devcontainer.json',import.meta.url),'utf8'));
  assert.equal(config.hostRequirements.cpus,2);assert.deepEqual(config.forwardPorts,[4187]);assert.doesNotMatch(JSON.stringify(config),/public|defaultPassword|8888/);
});

test('Codespaces rewritten Origin is accepted only for the exact port, secure proxy, matching Referer and valid CSRF',async t=>{
  const {app,domain}=await createApp({seed:false,publicOrigin:origin,test:true});t.after(()=>domain.close());
  const boot=await request(app).get('/api/bootstrap').set(headers).expect(200),cookie=boot.headers['set-cookie'][0].split(';')[0];
  const body={username:'proxy_user',password:'abc123',phoneTail:'1234'};
  const post=(o='http://localhost:4187',referer=origin+'/login.html',site='same-origin',csrf=boot.body.csrf)=>{
    let r=request(app).post('/api/auth/register').set(headers).set('Cookie',cookie).set('X-CSRF-Token',csrf).set('Origin',o).set('Sec-Fetch-Site',site);if(referer)r=r.set('Referer',referer);return r.send(body);
  };
  for(const [o,ref,site] of [['http://localhost:9999',origin,'same-origin'],['http://localhost:4187','https://attacker.example','same-origin'],['http://localhost:4187',null,'same-origin'],['http://localhost:4187',origin,'cross-site'],['https://other-4187.app.github.dev',origin,'same-origin']]){
    const rejected=await post(o,ref,site).expect(403);assert.equal(rejected.body.reason,'origin');
  }
  const missing=await post('http://localhost:4187',origin,'same-origin','wrong').expect(403);assert.equal(missing.body.reason,'token');
  assert.equal(domain.get('SELECT COUNT(*) n FROM members').n,0);
  const result=await post().expect(201);assert.equal(result.body.user.role,'member');assert.equal(result.body.user.username,'proxy_user');
});
