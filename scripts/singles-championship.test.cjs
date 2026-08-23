const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '..', 'singles-championship.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const DoveSinglesChampionship = context.window.DoveSinglesChampionship;
const plain = value => JSON.parse(JSON.stringify(value));

test('starts with six assigned QFs and two unassigned ready QFs', () => {
  const data = DoveSinglesChampionship.normalizeEvent();
  const assignedQfs = data.matches.filter(match => match.round === 'qf' && match.court);
  const next = DoveSinglesChampionship.nextUp(data);

  assert.equal(assignedQfs.length, 6);
  assert.deepEqual(plain(assignedQfs.map(match => Number(match.court))), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plain(next.map(match => match.id)), ['men-qf-4', 'women-qf-4']);
});

test('advances a QF winner into the dependent semifinal', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = DoveSinglesChampionship.finishMatch(data, 'men-qf-1', 'men-seed-1', 6, 2, '');
  data = DoveSinglesChampionship.finishMatch(data, 'men-qf-2', 'men-seed-4', 6, 4, '');

  const semifinal = DoveSinglesChampionship.matchById(data, 'men-sf-1');
  const players = DoveSinglesChampionship.competitors(data, semifinal).map(player => player && player.name);

  assert.equal(semifinal.status, 'Ready');
  assert.deepEqual(plain(players), ['Men 1', 'Men 4']);
});

test('court board falls back to free play when no official match is assigned', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = DoveSinglesChampionship.updateMatch(data, 'men-qf-1', { court: '' });
  data = DoveSinglesChampionship.updateMatch(data, 'women-qf-1', { court: '' });

  const board = DoveSinglesChampionship.courtBoard(data);

  assert.equal(board[0].mode, 'Free Play');
  assert.equal(board[3].mode, 'Free Play');
});
