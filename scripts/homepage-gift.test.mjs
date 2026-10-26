import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
test('welcome gift video loads only on request and retains accessible playback controls',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('<section id="welcome-gift"')<html.indexOf('<section id="events"'));
  const video=html.match(/<video id="giftVideo"[^>]*>/)[0];
  assert.ok(video.includes('controls playsinline preload="none"'));
  assert.ok(video.includes('data-src="assets/welcome/newcomer-gift.mp4"'));
  assert.ok(!video.includes('autoplay'));
  assert.ok(!/\ssrc=/.test(video));
  assert.ok(html.includes("dialog.addEventListener('close',()=>{video.pause()"));
  assert.ok((await stat(new URL('../assets/welcome/newcomer-gift.mp4',import.meta.url))).size<5_000_000);
});
