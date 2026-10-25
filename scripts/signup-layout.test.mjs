import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('keeps signup information separate from wrapping admin actions', async () => {
  const html = await readFile(new URL('../signup.html',import.meta.url),'utf8');
  assert.ok(html.includes('grid-template-columns: 22px 38px minmax(0,1fr)'));
  assert.ok(html.includes('.person-actions{grid-column:1/-1'));
  assert.ok(html.includes('class="person-status"'));
  assert.ok(html.includes('class="person-actions"'));
  assert.ok(html.includes('repeat(auto-fit,minmax(100px,1fr))'));
});
