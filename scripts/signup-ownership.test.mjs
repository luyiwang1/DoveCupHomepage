import test from 'node:test';
import assert from 'node:assert/strict';
import '../player-identity.js';
import '../signup-ownership.js';
import { buildReset } from './weekly-reset.mjs';
const api = globalThis.DoveSignupOwnership;
function storage() { const data = new Map(); return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}; }
test('recognizes canonical legacy names after restoration but rejects another browser owner', () => {
  const s = storage();
  assert.equal(api.owns({name:'Alvin Lyu'},'mine',s,'alvin'),true);
  assert.equal(api.owns({name:'Alvin Lyu',ownerKey:'other'},'mine',s,'alvin'),false);
  assert.equal(api.owns({name:'Someone'},'mine',s,''),false);
});
test('remembers multiple registrations and retains owner identity in archives', () => {
  const s = storage();
  api.remember(s,'Han','Alvin');
  api.remember(s,'Erika','Alvin');
  for (const name of ['Han M','Alvin Lyu','Erika Zhang']) assert.equal(api.owns({name},'mine',s,''),true);
  const result=buildReset({main:{state:{joined:[{id:1,name:'Han',ownerKey:'mine'}]}}},'2026-11-07');
  assert.equal(result.data.signupHistory['2026-11-07'].joined[0].ownerKey,'mine');
});
