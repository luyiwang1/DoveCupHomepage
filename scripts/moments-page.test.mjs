import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const homepage = await readFile(new URL('index.html', root), 'utf8');
const eventsPage = await readFile(new URL('events.html', root), 'utf8');
const momentsPage = await readFile(new URL('moments.html', root), 'utf8');

test('puts the complete photo archive on its own page', () => {
  assert.match(homepage, /class="moments-nav" href="moments\.html">Moments<\/a>/);
  assert.match(momentsPage, /assets\/moments\/event-14\.jpg/);
  assert.match(momentsPage, /mountArchive\('momentArchiveList','momentArchiveCount'\)/);
  assert.doesNotMatch(eventsPage, /id="momentArchiveList"/);
  assert.doesNotMatch(eventsPage, /moments-data\.js/);
});
