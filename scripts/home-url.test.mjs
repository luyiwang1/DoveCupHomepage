import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const homepage = await readFile(new URL('index.html', root), 'utf8');
const linkedPages = await Promise.all(
  ['events.html', 'moments.html', 'singles-championship.html', 'team-event.html', 'signup.html']
    .map(file => readFile(new URL(file, root), 'utf8'))
);

test('keeps one permanent public homepage URL', () => {
  assert.match(homepage, /<link rel="canonical" href="https:\/\/luyiwang1\.github\.io\/DoveCupHomepage\/">/);
  assert.match(homepage, /replace\(\/\\\/index\\\.html\$\/i, '\/'\)/);
  assert.match(homepage, /\['v', 'build', 'qa', 'check', 't'\]/);
});

test('all internal home links use the canonical directory address', () => {
  for (const page of linkedPages) assert.doesNotMatch(page, /index\.html/);
});
