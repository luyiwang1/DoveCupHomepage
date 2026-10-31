import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../tour-levels.js';
import '../venue-config.js';
import '../signup-capacity.js';
const rules=globalThis.DoveSignupCapacity,nyta=globalThis.DoveVenues.get('nyta-east');
const signup=await readFile(new URL('../signup.html',import.meta.url),'utf8');
test('retains venue entrances and independent shared total capacity controls',()=>{
  for(const text of ['id="venueMrtc"','id="venueNyta"','ACTIVE_VENUE.databasePath','val > DEFAULT_CAPACITY','capInput.max = DEFAULT_CAPACITY']) assert.ok(signup.includes(text));
  assert.ok(signup.includes('周六 5–7 PM · 最多 32 人'));
  assert.ok(signup.includes('周六 9–11 PM · 最多 12 人'));
});
test('uses division eligibility for signup, single promotion, and automatic promotion',()=>{
  assert.ok(signup.includes("list === 'joined' && !canJoinSignup(levelGroup)"));
  assert.ok(signup.includes('!canJoinSignup(levelKeyOf(w))'));
  assert.ok(signup.includes('state.waitlist.findIndex(p => canJoinSignup(levelKeyOf(p)))'));
});
test('NYTA caps divisions at four while retaining twelve total and MRTC shared capacity',()=>{
  const joined=Array.from({length:4},(_,id)=>({id,levelGroup:'u20'}));
  const state={capacity:12,joined,waitlist:[]};
  assert.equal(rules.canJoin(state,nyta,'u20'),false);
  assert.equal(rules.canJoin(state,nyta,'25_30'),true);
  assert.equal(rules.canJoin({...state,capacity:32},globalThis.DoveVenues.get('mrtc'),'u20'),true);
  const full={...state,joined:[...joined,...Array.from({length:8},(_,id)=>({id:id+4,levelGroup:id<4?'25_30':'30_plus'}))]};
  assert.equal(rules.canJoin(full,nyta,'35_plus'),false);
});
test('overflow moves to waitlist in roster order without losing payment or identity fields',()=>{
  const joined=Array.from({length:5},(_,id)=>({id,levelGroup:'u20',paymentAmount:350,paymentStatus:'received',phoneLast4:'0012',ownerKey:'owner',ts:100+id}));
  const next=rules.rebalance({capacity:12,joined,waitlist:[{id:9,levelGroup:'25_30'}]},nyta);
  assert.equal(next.joined.length,4);
  assert.deepEqual(next.waitlist[0],joined[4]);
  assert.equal(next.waitlist[1].id,9);
  assert.equal(next.waitlist.findIndex(p=>rules.canJoin(next,nyta,p.levelGroup)),1);
  assert.deepEqual(rules.rebalance(next,nyta),next);
});
