import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../events-data.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);

const event = context.window.DOVE_EVENTS[0];
const status = context.window.DoveEventStatus;

test('updates a special-event status using the Toronto calendar date', () => {
  assert.equal(status.forEvent(event, Date.parse('2026-08-08T03:59:59Z')), '即将开始');
  assert.equal(status.forEvent(event, Date.parse('2026-08-08T04:00:00Z')), '进行中');
  assert.equal(status.forEvent(event, Date.parse('2026-08-09T04:00:00Z')), '已结束');
});

test('maps each automatic status to its visual color class', () => {
  assert.equal(status.classFor('即将开始'), 'status-upcoming');
  assert.equal(status.classFor('进行中'), 'status-live');
  assert.equal(status.classFor('已结束'), 'status-ended');
});
