import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),start=source.indexOf('async function api('),end=source.indexOf('async function refresh()',start),transport=source.slice(start,end);
function client(responses,user=null){const calls=[],state={csrf:'old',user};const context=vm.createContext({state,fetch:async(url,options)=>{calls.push({url,options});const response=responses.shift();if(!response)throw Error('Unexpected retry');return {ok:response.status===200,status:response.status,json:async()=>response.data};},Error});vm.runInContext(transport,context);return {api:context.api,calls,state};}
test('expired CSRF refreshes once and retries without changing the submitted registration',async()=>{
  const c=client([{status:403,data:{error:'csrf_invalid',reason:'token'}},{status:200,data:{csrf:'new',user:null}},{status:200,data:{ok:true}}]);
  const body={username:'player',password:'abc123'};assert.equal((await c.api('/auth/register','POST',body)).ok,true);
  assert.deepEqual(c.calls.map(x=>x.url),['/api/auth/register','/api/bootstrap','/api/auth/register']);
  assert.equal(c.calls[0].options.body,c.calls[2].options.body);assert.equal(c.calls[2].options.headers['X-CSRF-Token'],'new');
  assert.equal(c.calls[0].options.cache,'no-store');assert.equal(c.calls[0].options.credentials,'same-origin');
});
test('origin failures and unrelated errors are never retried',async()=>{
  for(const response of [{status:403,data:{error:'csrf_invalid',reason:'origin'}},{status:500,data:{error:'server_error'}},{status:403,data:{error:'admin_required'}}]){const c=client([response]);await assert.rejects(c.api('/auth/register','POST',{}));assert.equal(c.calls.length,1);}
});
test('cookie loss cannot cause an infinite retry and identity changes cannot resend another member action',async()=>{
  const c=client([{status:403,data:{error:'csrf_invalid',reason:'token'}},{status:200,data:{csrf:'new',user:null}},{status:403,data:{error:'csrf_invalid',reason:'token'}}]);await assert.rejects(c.api('/auth/register','POST',{}));assert.equal(c.calls.length,3);
  const changed=client([{status:403,data:{error:'csrf_invalid',reason:'token'}},{status:200,data:{csrf:'new',user:{id:'other'}}}],{id:'original'});await assert.rejects(changed.api('/bookings','POST',{}));assert.equal(changed.calls.length,2);
});
