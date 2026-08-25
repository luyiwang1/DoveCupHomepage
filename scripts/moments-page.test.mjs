import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const homepage = await readFile(new URL('index.html', root), 'utf8');
const eventsPage = await readFile(new URL('events.html', root), 'utf8');
const momentsPage = await readFile(new URL('moments.html', root), 'utf8');
const siteNav = await readFile(new URL('site-nav.js', root), 'utf8');
const momentsData = await readFile(new URL('moments-data.js', root), 'utf8');

test('puts the complete photo archive on its own page', () => {
  assert.match(homepage, /site-nav\.js\?v=2/);
  assert.match(siteNav, /href: 'moments\.html'/);
  assert.match(momentsPage, /assets\/moments\/event-14\.jpg/);
  assert.match(momentsPage, /mountArchive\('momentArchiveList','momentArchiveCount'\)/);
  assert.doesNotMatch(eventsPage, /id="momentArchiveList"/);
  assert.doesNotMatch(eventsPage, /moments-data\.js/);
  assert.doesNotMatch(eventsPage, /Photo Archive/);
  assert.doesNotMatch(eventsPage, /gallery-link/);
  assert.doesNotMatch(eventsPage, /gallery\.js/);
});

test('keeps the invitation court photo on the homepage only', () => {
  assert.match(homepage, /assets\/home\/invitation-court\.jpg/);
  assert.doesNotMatch(momentsData, /invitation-court\.jpg/);
});
