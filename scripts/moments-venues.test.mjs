import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const context = { window: {} };
for (const file of ['moments-data.js', 'moments.js']) vm.runInNewContext(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), context);
const api = context.window.DoveMoments;
test('keeps existing photos in MRTC and reserves an independent NYTA archive', () => {
  assert.equal(api.photoMoments('mrtc').length, 17);
  assert.equal(api.photoMoments('nyta-east').length, 0);
  assert.equal(api.galleryEvent('mrtc').gallery.photos.length, 17);
  assert.equal(api.galleryEvent('nyta-east').gallery.photos.length, 0);
});
test('new NYTA photos appear only in the NYTA collection and fullscreen gallery', () => {
  context.window.DOVE_MOMENTS.push({ eventNumber: 18, venueKey: 'nyta-east', photo: { src: 'nyta.jpg' } });
  context.window.DOVE_MOMENTS_GALLERY.gallery.photos.push({ eventNumber: 18, src: 'nyta.jpg' });
  assert.equal(api.photoMoments('mrtc').length, 17);
  assert.equal(api.photoMoments('nyta-east')[0].eventNumber, 18);
  assert.equal(api.galleryEvent('nyta-east').gallery.photos.length, 1);
  assert.equal(api.galleryEvent('nyta-east').gallery.photos[0].src, 'nyta.jpg');
});
