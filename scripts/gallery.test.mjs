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

test('uses the configured event cover while the photo album is pending', () => {
  assert.equal(api.galleryFor(event).title, '凤凰 vs 狮鹫');
  assert.equal(api.coverFor(event), 'golden-dove-cup-hero-v2.webp');
  assert.equal(api.hasPhotos(event), false);
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
