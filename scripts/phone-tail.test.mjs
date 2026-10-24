import test from 'node:test';
import assert from 'node:assert/strict';
import '../phone-tail.js';
import { buildReset } from './weekly-reset.mjs';
test('accepts exactly four digits and preserves leading zeros, never full phone numbers', () => {
  assert.equal(globalThis.DovePhoneTail.normalize('0012'), '0012');
  for (const value of ['',null,'abc4','123','12345','4165551234','+1 416 555 1234']) assert.equal(globalThis.DovePhoneTail.normalize(value), null);
});
test('archives only valid tails for joined and waitlisted players', () => {
  const result = buildReset({main:{state:{joined:[{id:1,name:'Test A',phoneLast4:'0012'}],waitlist:[{id:2,name:'Test B',phoneLast4:'4165551234'}]}}}, '2026-11-07');
  assert.equal(result.data.signupHistory['2026-11-07'].joined[0].phoneLast4,'0012');
  assert.equal(result.data.signupHistory['2026-11-07'].waitlist[0].phoneLast4,null);
});
