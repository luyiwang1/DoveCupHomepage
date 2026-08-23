import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const script = await readFile(new URL('../moments.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../moments.css', import.meta.url), 'utf8');

test('renders Moments as a slow seamless marquee with fullscreen photos', () => {
  assert.match(script, /moment-marquee-track/);
  assert.match(script, /moment-marquee-group[^>]*aria-hidden="true"/);
  assert.match(script, /DoveMoments\.openMoment/);
  assert.match(styles, /animation:moment-marquee 150s linear infinite/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /animation-play-state:paused/);
});
