import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const require = createRequire(import.meta.url);
require('../moments.js');
const { randomStartIndex } = globalThis.DoveMoments;
const script = await readFile(new URL('../moments.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../moments.css', import.meta.url), 'utf8');

test('chooses a stable in-range desktop starting photo', () => {
  assert.equal(randomStartIndex(0, () => 0.7), 0);
  assert.equal(randomStartIndex(12, () => 0), 0);
  assert.equal(randomStartIndex(12, () => 0.5), 6);
  assert.equal(randomStartIndex(12, () => 0.999999), 11);
});

test('renders Moments as a slow seamless marquee with fullscreen photos', () => {
  assert.match(script, /moment-marquee-track/);
  assert.match(script, /moment-marquee-group[^>]*aria-hidden="true"/);
  assert.match(script, /DoveMoments\.openMoment/);
  assert.match(script, /moment-slide-caption/);
  assert.match(script, /moment-archive-stamp/);
  assert.match(script, /momentDetails/);
  assert.match(script, /randomStartIndex/);
  assert.match(script, /matchMedia\('\(max-width: 560px\)'\)/);
  assert.match(script, /--moment-marquee-delay/);
  assert.match(styles, /animation:moment-marquee 190s linear infinite/);
  assert.match(styles, /animation-delay:var\(--moment-marquee-delay,0s\)/);
  assert.match(styles, /flex:0 0 clamp\(380px,48vw,620px\)/);
  assert.match(styles, /flex-basis:86vw/);
  assert.match(styles, /scroll-snap-type:x mandatory/);
  assert.match(styles, /moment-marquee-track\{animation:none;will-change:auto\}/);
  assert.match(styles, /moment-marquee-group\[aria-hidden="true"\]\{display:none\}/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /animation-play-state:paused/);
});
