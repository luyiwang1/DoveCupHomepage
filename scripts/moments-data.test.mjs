import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../moments-data.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);

const moments = context.globalThis.DOVE_MOMENTS;
const gallery = context.globalThis.DOVE_MOMENTS_GALLERY;

test('keeps an eleven-event archive without duplicating the missing photo', () => {
  assert.equal(moments.length, 11);
  assert.deepEqual(JSON.parse(JSON.stringify(moments.map(moment => moment.eventNumber))), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(moments.filter(moment => moment.photo).length, 10);
  assert.equal(moments.find(moment => moment.eventNumber === 9).photo, null);
});

test('marks only Event 10 as the special team event', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(moments.filter(moment => moment.type === 'special').map(moment => moment.eventNumber))),
    [10]
  );
  assert.equal(moments.find(moment => moment.eventNumber === 10).titleEn, 'Phoenix vs Griffin');
});

test('builds the fullscreen gallery in chronological order', () => {
  assert.equal(gallery.gallery.photos.length, 10);
  assert.deepEqual(
    JSON.parse(JSON.stringify(gallery.gallery.photos.map(photo => photo.eventNumber))),
    [1, 2, 3, 4, 5, 6, 7, 8, 10, 11]
  );
});

test('references image assets that exist in the published site', async () => {
  await Promise.all(moments.filter(moment => moment.photo).map(moment =>
    access(new URL(`../${moment.photo.src}`, import.meta.url))
  ));
});
