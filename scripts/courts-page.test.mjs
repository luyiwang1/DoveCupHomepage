import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../courts.html', import.meta.url), 'utf8');

test('shows only the first round on the weekly courts page', () => {
  assert.match(page, /第一轮场地安排/);
  assert.match(page, /第一轮对阵与比分/);
  assert.match(page, /function buildRounds\(\)\{rounds=\[baseCourts\.map/);
  assert.doesNotMatch(page, /三轮总表/);
  assert.doesNotMatch(page, /第 2 轮/);
  assert.doesNotMatch(page, /第 3 轮/);
});

test('uses a readable responsive court table', () => {
  assert.match(page, /assignment-court-number/);
  assert.match(page, /assignment-team-box/);
  assert.match(page, /<th>VS<\/th>/);
  assert.match(page, /@media\(max-width:700px\)/);
  assert.match(page, /\.assignment-table thead\{display:none\}/);
});
