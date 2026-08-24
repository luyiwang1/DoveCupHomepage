import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const pages = ['index.html', 'events.html', 'moments.html', 'signup.html', 'courts.html', 'scores.html', 'singles-championship.html', 'team-event.html'];
const sources = await Promise.all(pages.map(page => readFile(new URL(page, root), 'utf8')));
const navScript = await readFile(new URL('site-nav.js', root), 'utf8');
const navStyles = await readFile(new URL('site-nav.css', root), 'utf8');

test('loads one shared site navigation on every public interface', () => {
  sources.forEach(source => {
    assert.match(source, /site-nav\.css\?v=2/);
    assert.match(source, /site-nav\.js\?v=2/);
  });
});

test('shared navigation connects About, Events, Moments, Format, and registration', () => {
  assert.match(navScript, /href: '\.\/#about'/);
  assert.match(navScript, /href: 'events\.html'/);
  assert.match(navScript, /href: 'moments\.html'/);
  assert.match(navScript, /href: '\.\/#format'/);
  assert.match(navScript, /href="signup\.html"/);
  assert.match(navStyles, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(navScript, /\['signup\.html', 'courts\.html', 'scores\.html'\]/);
  assert.match(navStyles, /\.dove-tour-tool \.dove-site-nav\{width:100vw/);
  assert.match(navStyles, /\.dove-tour-tool\{--dove-site-nav-height:86px\}/);
});
