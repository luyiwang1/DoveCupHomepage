import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const script = await readFile(new URL('../moments.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../moments.css', import.meta.url), 'utf8');

test('renders Moments as a slow seamless marquee with fullscreen photos', () => {
  assert.match(script, /moment-marquee-track/);
  assert.match(script, /moment-marquee-group[^>]*aria-hidden="true"/);
  assert.match(script, /DoveMoments\.openMoment/);
  assert.match(script, /moment-slide-caption/);
  assert.match(script, /moment-archive-stamp/);
  assert.match(script, /momentDetails/);
  assert.match(styles, /animation:moment-marquee 190s linear infinite/);
  assert.match(styles, /flex:0 0 clamp\(380px,48vw,620px\)/);
  assert.match(styles, /flex-basis:86vw/);
  assert.match(styles, /scroll-snap-type:x mandatory/);
  assert.match(styles, /moment-marquee-track\{animation:none;will-change:auto\}/);
  assert.match(styles, /moment-marquee-group\[aria-hidden="true"\]\{display:none\}/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /animation-play-state:paused/);
});
