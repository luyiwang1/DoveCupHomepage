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

function fillDivision(data, division, prefix) {
  let next = data;
  for (let index = 1; index <= 8; index += 1) {
    next = DoveSinglesChampionship.registerPlayer(next, division, `${prefix} ${index}`, `owner-${division}-${index}`, `entry-${division}-${index}`, index);
  }
  return next;
}

test('starts with empty signup slots and no official matches ready', () => {
  const data = DoveSinglesChampionship.normalizeEvent();
  const board = DoveSinglesChampionship.courtBoard(data);

  assert.equal(data.registration.entries.length, 0);
  assert.equal(data.matches.filter(match => match.status === 'Ready').length, 0);
  assert.ok(board.every(court => court.mode === 'Free Play'));
});

test('fills eight men and eight women into stable slots and activates the opening QFs', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = fillDivision(data, 'men', 'Man');
  data = fillDivision(data, 'women', 'Woman');

  const assignedQfs = data.matches.filter(match => match.round === 'qf' && match.court);
  const next = DoveSinglesChampionship.nextUp(data);
  const courtOne = DoveSinglesChampionship.courtBoard(data)[0];
  const courtOnePlayers = DoveSinglesChampionship.competitors(data, courtOne.current).map(player => player && player.name);

  assert.equal(data.registration.entries.length, 16);
  assert.deepEqual(plain(data.players.men.map(player => player.name)), ['Man 1', 'Man 2', 'Man 3', 'Man 4', 'Man 5', 'Man 6', 'Man 7', 'Man 8']);
  assert.equal(assignedQfs.length, 6);
  assert.deepEqual(plain(assignedQfs.map(match => Number(match.court))), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plain(next.map(match => match.id)), ['men-qf-4', 'women-qf-4']);
  assert.equal(courtOne.current.id, 'men-qf-1');
  assert.deepEqual(plain(courtOnePlayers), ['Man 1', 'Man 8']);
});

test('advances a QF winner into the dependent semifinal', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = fillDivision(data, 'men', 'Man');
  data = DoveSinglesChampionship.finishMatch(data, 'men-qf-1', 'men-seed-1', 6, 2, '');
  data = DoveSinglesChampionship.finishMatch(data, 'men-qf-2', 'men-seed-4', 6, 4, '');

  const semifinal = DoveSinglesChampionship.matchById(data, 'men-sf-1');
  const players = DoveSinglesChampionship.competitors(data, semifinal).map(player => player && player.name);

  assert.equal(semifinal.status, 'Ready');
  assert.deepEqual(plain(players), ['Man 1', 'Man 4']);
});

test('court board falls back to free play when no official match is assigned', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = DoveSinglesChampionship.updateMatch(data, 'men-qf-1', { court: '' });
  data = DoveSinglesChampionship.updateMatch(data, 'women-qf-1', { court: '' });

  const board = DoveSinglesChampionship.courtBoard(data);

  assert.equal(board[0].mode, 'Free Play');
  assert.equal(board[3].mode, 'Free Play');
});

test('rejects duplicate names and a ninth player in one division', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = fillDivision(data, 'men', 'Man');

  assert.equal(DoveSinglesChampionship.registrationIssue(data, 'women', 'Man 1'), 'This name is already registered');
  assert.equal(DoveSinglesChampionship.registrationIssue(data, 'men', 'Man 9'), 'This division is full');
  assert.equal(DoveSinglesChampionship.registerPlayer(data, 'men', 'Man 9', 'owner-9', 'entry-9').registration.entries.length, 8);
});

test('removes only an owned signup and keeps every other slot stable', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = DoveSinglesChampionship.registerPlayer(data, 'women', 'Erika Zhang', 'owner-erika', 'entry-erika', 1);
  data = DoveSinglesChampionship.registerPlayer(data, 'women', 'Linda', 'owner-linda', 'entry-linda', 2);

  const unchanged = DoveSinglesChampionship.removeRegistration(data, 'entry-erika', 'wrong-owner', false);
  const removed = DoveSinglesChampionship.removeRegistration(data, 'entry-erika', 'owner-erika', false);

  assert.equal(unchanged.registration.entries.length, 2);
  assert.equal(removed.registration.entries.length, 1);
  assert.equal(removed.registration.entries[0].slot, 2);
  assert.equal(removed.players.women[0].name, '');
  assert.equal(removed.players.women[1].name, 'Linda');
});

test('locks the signup as soon as the first official match starts', () => {
  let data = DoveSinglesChampionship.normalizeEvent();
  data = fillDivision(data, 'men', 'Man');
  data = DoveSinglesChampionship.startMatch(data, 'men-qf-1', 1, 1000);

  assert.equal(data.registration.open, false);
  assert.equal(DoveSinglesChampionship.registrationIssue(data, 'women', 'New Player'), 'Registration is closed');
  assert.equal(DoveSinglesChampionship.setRegistrationOpen(data, true).registration.open, false);
});
