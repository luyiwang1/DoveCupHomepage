import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const homepage = await readFile(new URL('index.html', root), 'utf8');
const eventsPage = await readFile(new URL('events.html', root), 'utf8');
const momentsPage = await readFile(new URL('moments.html', root), 'utf8');
const siteNav = await readFile(new URL('site-nav.js', root), 'utf8');
const momentsData = await readFile(new URL('moments-data.js', root), 'utf8');

test('puts the complete photo archive on its own page', () => {
  assert.match(homepage, /site-nav\.js\?v=2/);
  assert.match(siteNav, /href: 'moments\.html'/);
  assert.match(momentsPage, /assets\/events\/2026-08-29\/dove-king-group-photo\.jpg/);
  assert.match(momentsPage, /mountArchive\('momentArchiveList','momentArchiveCount'\)/);
  assert.doesNotMatch(eventsPage, /id="momentArchiveList"/);
  assert.doesNotMatch(eventsPage, /moments-data\.js/);
  assert.doesNotMatch(eventsPage, /Photo Archive/);
  assert.doesNotMatch(eventsPage, /gallery-link/);
  assert.doesNotMatch(eventsPage, /gallery\.js/);
});

test('keeps the invitation court photo on the homepage only', () => {
  assert.match(homepage, /assets\/home\/invitation-court\.jpg/);
  assert.match(homepage, /assets\/home\/invitation-court-02\.jpg/);
  assert.match(homepage, /intro-copy-panel-primary/);
  assert.match(homepage, /intro-copy-panel-secondary/);
  assert.match(homepage, /intro-scene-primary 24s ease-in-out infinite/);
  assert.match(homepage, /intro-copy-primary 24s ease-in-out infinite/);
  assert.match(homepage, /intro-copy-secondary 24s ease-in-out infinite/);
  assert.match(homepage, /intro-surface 24s ease-in-out infinite/);
  assert.match(homepage, /id="format" class="intro-anchor"/);
  assert.doesNotMatch(homepage, /<section id="format" class="format">/);
  assert.match(homepage, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(momentsData, /invitation-court\.jpg/);
  assert.doesNotMatch(momentsData, /invitation-court-02\.jpg/);
});

test('uses the net-side social photo only as the events hero', async () => {
  assert.match(eventsPage, /assets\/events\/events-hero-net-social\.webp/);
  assert.match(eventsPage, /width:min\(72vw,1040px\)/);
  assert.match(eventsPage, /mask-image:linear-gradient/);
  assert.match(eventsPage, /center 64%\/cover no-repeat/);
  assert.doesNotMatch(momentsData, /events-hero-net-social\.webp/);
  await access(new URL('assets/events/events-hero-net-social.webp', root));
});

test('starts the merged section on the requested scene without desynchronizing photos', () => {
  const script = homepage.match(/\(function mountIntroScenes\(\)\{[\s\S]*?\n\}\(\)\);/)[0];
  const animations = Array.from({ length: 6 }, () => ({ currentTime: 5000 }));
  const handlers = {};
  const location = { hash: '#about' };
  let onVisible;
  let disconnected = false;
  vm.runInNewContext(script, {
    location,
    window: { addEventListener: (name, callback) => { handlers[name] = callback; } },
    document: {
      getElementById: () => ({ getAnimations: () => animations }),
      addEventListener: (name, callback) => { handlers[name] = callback; }
    },
    IntersectionObserver: class {
      constructor(callback) { onVisible = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    }
  });
  onVisible([{ isIntersecting: true }]);
  assert.ok(disconnected);
  assert.ok(animations.every(animation => animation.currentTime === 0));
  location.hash = '#format';
  handlers.hashchange();
  assert.ok(animations.every(animation => animation.currentTime === 12000));
  animations.forEach(animation => { animation.currentTime = 20000; });
  handlers.click({ target: { closest: () => ({ hash: '#format' }) } });
  assert.ok(animations.every(animation => animation.currentTime === 12000));
  location.hash = '#about';
  handlers.hashchange();
  assert.ok(animations.every(animation => animation.currentTime === 0));
});
