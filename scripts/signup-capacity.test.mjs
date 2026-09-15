import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const signup = await readFile(new URL('../signup.html', import.meta.url), 'utf8');
const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('shares one 32-player capacity across every signup division', () => {
  assert.match(signup, /const DEFAULT_CAPACITY = 32;/);
  assert.match(signup, /function openSignupSlots\(\)/);
  assert.match(signup, /if \(list === 'joined' && !canJoinSignup\(\)\)/);
  assert.match(signup, /function waitlistIndexForOpenSlot\(\) \{\s*return canJoinSignup\(\) && state\.waitlist\.length \? 0 : -1;/);
  assert.doesNotMatch(signup, /LEVEL_CAPACITY/);
  assert.doesNotMatch(signup, /canJoinLevel/);
  assert.doesNotMatch(signup, /openSlotsForLevel/);
});

test('shows section counts without an eight-player denominator', () => {
  assert.match(signup, /\$\{group\.people\.length\} 人<\/span>/);
  assert.doesNotMatch(signup, /group\.people\.length\} \/ \$\{/);
  assert.match(signup, /四个分级共享 \$\{state\.capacity \|\| DEFAULT_CAPACITY\} 个名额/);
  assert.match(homepage, /四组共享 32 个报名名额/);
});

test('keeps 32 as the hard maximum for admin capacity changes', () => {
  assert.match(signup, /id="capInput" placeholder="32" min="1" max="32"/);
  assert.match(signup, /val > DEFAULT_CAPACITY/);
});
