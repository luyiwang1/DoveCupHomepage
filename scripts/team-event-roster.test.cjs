const assert = require('node:assert/strict');
const test = require('node:test');
require('../team-event-roster.js');

const roster = globalThis.DoveTeamRoster;

function player(name, team, gender, joinedAt = 1, details = {}) {
  return { id: name, name, team, gender, joinedAt, ...details };
}

test('normalizes registrations and removes duplicate names', () => {
  const result = roster.normalizeRegistrations([
    player(' Alice ', 'phoenix', 'female'),
    player('alice', 'griffin', 'female'),
    player('Bob', 'phoenix', 'male')
  ]);
  assert.deepEqual(result.map(item => item.name), ['Alice', 'Bob']);
});

test('auto assignment balances the same gender across teams', () => {
  const registrations = [
    player('A', 'phoenix', 'male'),
    player('B', 'phoenix', 'male'),
    player('C', 'griffin', 'male')
  ];
  assert.equal(roster.chooseTeam(registrations, 'male', 'auto', 4), 'griffin');
});

test('auto assignment randomizes a tied team choice', () => {
  assert.equal(roster.chooseTeam([], 'male', 'auto', 4, 0.1), 'phoenix');
  assert.equal(roster.chooseTeam([], 'male', 'auto', 4, 0.9), 'griffin');
});

test('fixed mixed partners are assigned to the same available team', () => {
  const registrations = [
    player('Man A', 'phoenix', 'male'),
    player('Woman A', 'phoenix', 'female')
  ];
  assert.equal(roster.choosePairTeam(registrations, 'auto', 4, 0.5), 'griffin');
});

test('explicit team assignment rejects a full gender group', () => {
  const registrations = ['A', 'B', 'C', 'D'].map(name => player(name, 'phoenix', 'female'));
  assert.equal(roster.chooseTeam(registrations, 'female', 'phoenix', 4), null);
  assert.equal(roster.chooseTeam(registrations, 'female', 'griffin', 4), 'griffin');
});

test('builds fixed mixed pairs in signup order', () => {
  const registrations = [
    player('Man 2', 'phoenix', 'male', 2),
    player('Woman 1', 'phoenix', 'female', 1),
    player('Man 1', 'phoenix', 'male', 1),
    player('Woman 2', 'phoenix', 'female', 2)
  ];
  const pairs = roster.buildPairs(registrations, 'phoenix', ['pair-1', 'pair-2']);
  assert.deepEqual(pairs.map(pair => [pair.player1, pair.player2]), [
    ['Man 1', 'Woman 1'],
    ['Man 2', 'Woman 2']
  ]);
});

test('keeps fixed signup partners locked when building pairs', () => {
  const locked = {
    signupMode: 'pair',
    groupId: 'group-1',
    pairName: 'Always Together'
  };
  const registrations = [
    player('Single Man', 'phoenix', 'male', 1),
    player('Locked Woman', 'phoenix', 'female', 3, locked),
    player('Single Woman', 'phoenix', 'female', 2),
    player('Locked Man', 'phoenix', 'male', 3, locked)
  ];
  const pairs = roster.buildPairs(registrations, 'phoenix', ['pair-1', 'pair-2']);
  assert.deepEqual([pairs[0].player1, pairs[0].player2], ['Locked Man', 'Locked Woman']);
  assert.equal(pairs[0].lockedGroupId, 'group-1');
  assert.equal(pairs[0].pairName, 'Always Together');
  assert.deepEqual([pairs[1].player1, pairs[1].player2], ['Single Man', 'Single Woman']);
});

test('removes a fixed signup as one linked group', () => {
  const details = { signupMode: 'pair', groupId: 'group-1' };
  const registrations = [
    player('Partner A', 'griffin', 'male', 1, details),
    player('Partner B', 'griffin', 'female', 2, details),
    player('Solo', 'griffin', 'male', 3)
  ];
  assert.deepEqual(
    roster.linkedRegistrations(registrations, 'Partner A').map(item => item.name),
    ['Partner A', 'Partner B']
  );
});

test('creates a stable roster signature and changes it when pairing data changes', () => {
  const first = player('A', 'phoenix', 'male', 1);
  const second = player('B', 'griffin', 'female', 2);
  assert.equal(
    roster.rosterSignature([first, second]),
    roster.rosterSignature([second, first])
  );
  assert.notEqual(
    roster.rosterSignature([first, second]),
    roster.rosterSignature([first, { ...second, team: 'phoenix' }])
  );
});

test('chooses when to generate, adopt, or keep saved pairings', () => {
  const registrations = [player('A', 'phoenix', 'male', 1)];
  const signature = roster.rosterSignature(registrations);
  assert.equal(roster.pairingSyncMode([], '', false), 'none');
  assert.equal(roster.pairingSyncMode(registrations, signature, true), 'none');
  assert.equal(roster.pairingSyncMode(registrations, '', true), 'adopt');
  assert.equal(roster.pairingSyncMode(registrations, '', false), 'generate');
  assert.equal(roster.pairingSyncMode(registrations, 'older-roster', true), 'generate');
});

test('derives a compatible signup list from legacy fixed pairs', () => {
  const registrations = roster.deriveRegistrations({
    phoenix: { pairs: [{ player1: 'Alex', player2: 'Amy' }] },
    griffin: { pairs: [{ player1: 'Ben', player2: 'Bella' }] }
  });
  assert.equal(registrations.length, 4);
  assert.deepEqual(registrations.map(item => [item.team, item.gender]), [
    ['phoenix', 'male'], ['phoenix', 'female'], ['griffin', 'male'], ['griffin', 'female']
  ]);
});
