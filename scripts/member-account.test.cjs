const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const context = {};
context.globalThis = context;
vm.runInNewContext(readFileSync(require.resolve('../member-account.js'), 'utf8'), context);
const account = context.DoveMemberAccount;
const plain = value => JSON.parse(JSON.stringify(value));

test('normalizes member profile fields', () => {
  assert.deepEqual(plain(account.normalizeProfile({
    displayName: '  Alvin   Lyu  ',
    defaultLevel: '25_30',
    createdAt: 10
  }, 'member-1')), {
    uid: 'member-1',
    displayName: 'Alvin Lyu',
    defaultLevel: '25_30',
    createdAt: 10,
    updatedAt: 0,
    verifiedAt: 0
  });
  assert.equal(account.cleanLevel('unknown'), '20_25');
});

test('returns an identity only for a verified member with a profile', () => {
  const profile = { displayName: 'Erika Zhang', defaultLevel: '20_25' };
  assert.equal(account.identity({ user: { uid: 'member-2', emailVerified: false }, profile }), null);
  assert.equal(account.identity({ user: { uid: 'member-2', emailVerified: true }, profile: null }), null);
  assert.deepEqual(plain(account.identity({ user: { uid: 'member-2', emailVerified: true }, profile })), {
    memberUid: 'member-2',
    ownerKey: 'member-2',
    name: 'Erika Zhang',
    levelGroup: '20_25'
  });
});
