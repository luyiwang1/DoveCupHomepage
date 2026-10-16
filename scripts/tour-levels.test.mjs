import assert from 'node:assert/strict';
import test from 'node:test';
import '../tour-levels.js';
const levels = globalThis.DoveTourLevels;
test('uses four divisions from beginner under 2.5 through 3.5+', () => {
  assert.deepEqual(levels.groups.map(group => group.label), ['新手场 · 2.5-', '2.5-3.0', '3.0-3.5', '3.5+']);
  assert.equal(levels.normalize('20_25'), 'u20');
  assert.equal(levels.normalize('under3'), 'u20');
  assert.equal(levels.label('30_plus'), '3.0-3.5');
  assert.equal(levels.label('35_plus'), '3.5+');
});
