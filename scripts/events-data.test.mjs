import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../events-data.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);

const event = context.window.DOVE_EVENTS[0];
const status = context.window.DoveEventStatus;

test('stores the archived team-event result shown in the past-event card', () => {
  assert.equal(event.attendeeCount, 16);
  assert.deepEqual(
    JSON.parse(JSON.stringify(event.result)),
    { winner: '狮鹫', winnerPoints: 8, loserPoints: 4, winnerGames: 54, loserGames: 37 }
  );
});

test('keeps a bilingual event album ready for real activity photos', () => {
  assert.equal(event.eventNumber, 12);
  assert.equal(event.gallery.title, '凤凰 vs 狮鹫');
  assert.equal(event.gallery.titleEn, 'Phoenix vs Griffin');
  assert.equal(event.gallery.cover, 'assets/events/2026-08-08/team-group-photo-01.webp');
  assert.equal(event.gallery.photos.length, 1);
  assert.equal(event.gallery.photos[0].caption, 'EVENT 12 · 8 月 8 日凤凰 vs 狮鹫团体赛 · MRTC 赛后合影');
  assert.equal(event.gallery.photos[0].captionEn, 'EVENT 12 · Aug 8 Phoenix vs Griffin team event · Post-match photo at MRTC');
});

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
