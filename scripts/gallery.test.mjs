import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const eventsSource = await readFile(new URL('../events-data.js', import.meta.url), 'utf8');
const gallerySource = await readFile(new URL('../gallery.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(eventsSource, context);
vm.runInNewContext(gallerySource, context);

const api = context.window.DoveGallery;
const event = context.window.DOVE_EVENTS[0];

test('uses the first real team-event photo as the album cover', () => {
  assert.equal(api.galleryFor(event).title, '凤凰 vs 狮鹫');
  assert.equal(api.coverFor(event), 'assets/events/2026-08-08/team-group-photo-01.webp');
  assert.equal(api.hasPhotos(event), true);
  assert.equal(api.photosFor(event).length, 1);
});

test('keeps the preparation state available for future empty albums', () => {
  const pending = { gallery: { cover: 'brand-cover.webp', photos: [] } };
  assert.equal(api.coverFor(pending), 'brand-cover.webp');
  assert.equal(api.hasPhotos(pending), false);
});

test('exposes fullscreen gallery opening for carousel and archive views', () => {
  assert.equal(typeof api.openEventGallery, 'function');
  assert.equal(api.openEventGallery({ gallery: { photos: [] } }), false);
});

test('recognizes a published photo album and preserves bilingual captions', () => {
  const published = {
    gallery: {
      photos: [{ src: 'events/example.webp', caption: '开场合影', captionEn: 'Opening group photo' }]
    }
  };
  assert.equal(api.hasPhotos(published), true);
  assert.equal(api.coverFor(published), 'events/example.webp');
  assert.equal(api.copy(api.photosFor(published)[0], 'caption', 'en'), 'Opening group photo');
});
