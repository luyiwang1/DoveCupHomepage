import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../moments-data.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);

const moments = context.globalThis.DOVE_MOMENTS;
const gallery = context.globalThis.DOVE_MOMENTS_GALLERY;

test('keeps a complete fifteen-event photo archive', () => {
  assert.equal(moments.length, 15);
  assert.deepEqual(JSON.parse(JSON.stringify(moments.map(moment => moment.eventNumber))), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  assert.equal(moments.filter(moment => moment.photo).length, 15);
  assert.equal(moments.find(moment => moment.eventNumber === 5).photo.src, 'assets/moments/event-05-v2.webp');
  assert.equal(moments.find(moment => moment.eventNumber === 8).photo.src, 'assets/moments/event-08-v4.webp');
  assert.equal(moments.find(moment => moment.eventNumber === 11).photo.src, 'assets/moments/event-09.webp');
  assert.equal(moments.find(moment => moment.eventNumber === 1).dateLabel, '5月24日');
  assert.equal(moments.find(moment => moment.eventNumber === 12).dateLabel, '8月8日');
  assert.equal(moments.find(moment => moment.eventNumber === 13).dateLabelEn, 'AUG 15');
  assert.equal(moments.find(moment => moment.eventNumber === 14).dateLabel, '8月22日');
  assert.equal(moments.find(moment => moment.eventNumber === 14).photo.src, 'assets/moments/event-14.jpg');
  assert.equal(moments.find(moment => moment.eventNumber === 15).dateLabel, '8月29日');
  assert.equal(moments.find(moment => moment.eventNumber === 15).photo.src, 'assets/events/2026-08-29/dove-king-group-photo.jpg');
  assert.ok(moments.every(moment => moment.scheduleEn === 'SATURDAY · 5–7 PM'));
  assert.ok(moments.every(moment => moment.venueEn === 'MRTC · Toronto'));
  assert.match(moments[0].photo.caption, /5月24日 · 周六 · 17:00–19:00 · MRTC · 多伦多/);
  assert.match(moments[0].photo.captionEn, /MAY 24 · SATURDAY · 5–7 PM · MRTC · Toronto/);
});

test('marks Event 05, Event 08, Event 12, and Event 15 as special events', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(moments.filter(moment => moment.type === 'special').map(moment => moment.eventNumber))),
    [5, 8, 12, 15]
  );
  assert.equal(moments.find(moment => moment.eventNumber === 5).title, '金鸽男女单打赛');
  assert.equal(moments.find(moment => moment.eventNumber === 5).titleEn, 'Golden Dove Singles');
  assert.equal(moments.find(moment => moment.eventNumber === 5).typeLabel, '男单 · 女单');
  assert.equal(moments.find(moment => moment.eventNumber === 5).typeLabelEn, 'Men\'s + Women\'s Singles');
  assert.equal(moments.find(moment => moment.eventNumber === 8).title, '金鸽 × 大鱼杯');
  assert.equal(moments.find(moment => moment.eventNumber === 8).titleEn, 'Golden Dove x Big Fish Cup');
  assert.equal(moments.find(moment => moment.eventNumber === 8).typeLabelEn, 'Special Event');
  assert.equal(moments.find(moment => moment.eventNumber === 12).titleEn, 'Phoenix vs Griffin');
  assert.equal(moments.find(moment => moment.eventNumber === 15).title, '鸽王争霸赛');
  assert.equal(moments.find(moment => moment.eventNumber === 15).titleEn, 'Dove King Championship');
});

test('builds the fullscreen gallery in chronological order', () => {
  assert.equal(gallery.gallery.photos.length, 15);
  assert.deepEqual(
    JSON.parse(JSON.stringify(gallery.gallery.photos.map(photo => photo.eventNumber))),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  );
});

test('references image assets that exist in the published site', async () => {
  await Promise.all(moments.filter(moment => moment.photo).map(moment =>
    access(new URL(`../${moment.photo.src}`, import.meta.url))
  ));
});
