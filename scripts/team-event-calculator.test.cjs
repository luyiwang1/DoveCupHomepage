const assert = require('node:assert/strict');
const test = require('node:test');
require('../team-event-calculator.js');
const calculator = globalThis.DoveTeamCalculator;

function round(matches) {
  return [{ matches }];
}

test('awards one team point to each match winner', () => {
  const result = calculator.calculate(round([
    { phoenixGames: 6, griffinGames: 3 },
    { phoenixGames: 4, griffinGames: 6 }
  ]));
  assert.equal(result.phoenix.teamPoints, 1);
  assert.equal(result.griffin.teamPoints, 1);
  assert.equal(result.phoenix.games, 10);
  assert.equal(result.griffin.games, 9);
  assert.equal(result.winner, 'phoenix');
  assert.equal(result.decidedBy, 'games');
});

test('team points decide before total games', () => {
  const result = calculator.calculate(round([
    { phoenixGames: 6, griffinGames: 5 },
    { phoenixGames: 6, griffinGames: 5 },
    { phoenixGames: 0, griffinGames: 6 }
  ]));
  assert.equal(result.phoenix.teamPoints, 2);
  assert.equal(result.griffin.teamPoints, 1);
  assert.equal(result.phoenix.games < result.griffin.games, true);
  assert.equal(result.winner, 'phoenix');
  assert.equal(result.decidedBy, 'teamPoints');
});

test('equal timed score requires a winner override', () => {
  const pending = calculator.calculate(round([{ phoenixGames: 3, griffinGames: 3 }]));
  assert.equal(pending.pending, 1);
  assert.equal(pending.winner, null);

  const decided = calculator.calculate(round([
    { phoenixGames: 3, griffinGames: 3, winnerOverride: 'griffin' }
  ]));
  assert.equal(decided.griffin.teamPoints, 1);
  assert.equal(decided.winner, 'griffin');
});

test('reports an overall tie when team points and games are equal', () => {
  const result = calculator.calculate(round([
    { phoenixGames: 6, griffinGames: 4 },
    { phoenixGames: 4, griffinGames: 6 }
  ]));
  assert.equal(result.winner, null);
  assert.equal(result.decidedBy, 'tie');
});

test('detects repeated or missing fixed pairs in a round', () => {
  const matches = [1, 2, 3, 4].map(index => ({
    phoenixPairId: index === 4 ? 'p3' : `p${index}`,
    griffinPairId: `p${index}`
  }));
  assert.deepEqual(calculator.lineupIssues({ matches }, ['p1', 'p2', 'p3', 'p4']), ['phoenix']);
});

test('reuses a deleted matchup rotation for the next round', () => {
  const pairIds = ['p1', 'p2', 'p3', 'p4'];
  const rounds = [0, 2, 3].map(offset => ({
    matches: [{ phoenixPairId: 'p1', griffinPairId: pairIds[offset] }]
  }));
  assert.equal(calculator.nextRoundRotation(rounds, pairIds), 1);
});

test('deletes only the third round or later and always keeps two base rounds', () => {
  const rounds = [1, 2, 3, 4].map(number => ({
    id: `round-${number}`,
    name: `第 ${number} 轮`,
    matches: [{ phoenixGames: number, griffinGames: 0 }]
  }));
  const result = calculator.removeRound(rounds, 3);
  assert.deepEqual(result.map(item => item.id), ['round-1', 'round-2', 'round-3']);
  assert.deepEqual(result.map(item => item.name), ['第 1 轮', '第 2 轮', '第 3 轮']);
  assert.deepEqual(result.map(item => item.matches[0].phoenixGames), [1, 2, 3]);
  assert.equal(calculator.canRemoveRound(rounds, 0), false);
  assert.equal(calculator.canRemoveRound(rounds, 1), false);
  assert.equal(calculator.canRemoveRound(rounds, 2), true);
  assert.equal(calculator.removeRound(rounds.slice(0, 2), 1), null);
});
