const assert = require('node:assert/strict');
const test = require('node:test');
require('../team-event-roster.js');

const roster = globalThis.DoveTeamRoster;

function player(name, team, gender, joinedAt = 1) {
  return { id: name, name, team, gender, joinedAt };
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
