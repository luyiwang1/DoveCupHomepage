import assert from 'node:assert/strict';
import test from 'node:test';
import '../player-identity.js';
import { buildIdentityMigration, prepareVenueData } from './unify-player-identities.mjs';
import { buildReset, normalizeName } from './weekly-reset.mjs';

const identity = globalThis.DovePlayerIdentity;
test('uses only confirmed aliases and preserves unconfirmed people', () => {
  for (const [alias, canonical] of [['Daniel', 'Mr . DANIEL'], ['alvin', 'Alvin Lyu'], ['ERIKA', 'Erika Zhang'], [' Han ', 'Han M'], ['xin yi', '葉 ღ']]) {
    assert.equal(identity.canonicalName(alias), canonical);
    assert.equal(normalizeName(alias), normalizeName(canonical));
  }
  for (const name of ['Dan', 'Erica', 'maggie', 'Alvin L']) assert.equal(identity.canonicalName(name), name);
});

test('merges attendance, deduplicates same-event aliases and preserves match IDs', () => {
  const before = { main: { state: { joined: [{ id: 1, name: 'Han' }, { id: 2, name: 'Han M' }], waitlist: [{ id: 3, name: 'Han' }] } }, scores: {
    players: { han: { name: 'Han', appearances: 2, lastPlayedAt: 200 }, 'han m': { name: 'Han M', appearances: 3, lastPlayedAt: 100 }, dan: { name: 'Dan', appearances: 1 } },
    attendanceWeeks: { one: { count: 2, names: ['Han', 'Han M'] }, two: { count: 1, names: ['Han'] } }
  }, singlesChampionship: { match: { winnerId: 'men-4', player: { id: 'men-4', name: 'xin yi' } } } };
  const result = buildIdentityMigration(before, 300);
  assert.equal(result.data.scores.players['han m'].appearances, 4);
  assert.equal(result.data.scores.players['han m'].lastPlayedAt, 200);
  assert.equal(result.data.scores.players.han, undefined);
  assert.equal(result.data.scores.players.dan.appearances, 1);
  assert.equal(result.data.main.state.joined.length, 1);
  assert.equal(result.data.main.state.waitlist.length, 0);
  assert.equal(result.data.singlesChampionship.match.player.name, '葉 ღ');
  assert.equal(result.data.singlesChampionship.match.winnerId, 'men-4');
  assert.equal(before.scores.players.han.appearances, 2);
  assert.equal(buildIdentityMigration(result.data).changed, false);
});

test('future archives count confirmed aliases only once within a venue', () => {
  const result = buildReset({ main: { state: { joined: [{ name: 'Han' }, { name: 'Han M' }] } } }, '2026-10-17');
  assert.equal(result.data.scores.players['han m'].appearances, 1);
  assert.deepEqual(result.data.scores.attendanceWeeks['2026-10-17'].names, ['Han M']);
});

test('initializes NYTA without changing MRTC and preserves an existing NYTA list', () => {
  const main = { state: { capacity: 32, joined: [{ name: 'Irene' }] } };
  const result = prepareVenueData({ main }, 100);
  assert.deepEqual(result.data.main, main);
  assert.equal(result.data.venues['nyta-east'].main.state.capacity, 12);
  result.data.venues['nyta-east'].main.state.joined.push({ name: 'Han M' });
  const again = prepareVenueData(result.data);
  assert.equal(again.changed, false);
  assert.equal(again.data.venues['nyta-east'].main.state.joined.length, 1);
});

test('does not clear newly enabled NYTA for a previous week', () => {
  const setup = prepareVenueData({ main: { state: { joined: [] } } }, Date.parse('2026-10-16T15:00:00Z'));
  assert.equal(setup.data.venues['nyta-east'].enabledFrom, '2026-10-17');
  setup.data.venues['nyta-east'].main.state.joined.push({ name: 'Han M' });
  const previous = buildReset(setup.data, '2026-10-10');
  assert.equal(previous.data.venues['nyta-east'].main.state.joined.length, 1);
  assert.equal(previous.data.signupHistory['2026-10-10__nyta-east'], undefined);
  const due = buildReset(previous.data, '2026-10-17');
  assert.equal(due.data.venues['nyta-east'].main.state.joined.length, 0);
  assert.equal(due.data.scores.players['han m'].appearances, 1);
});
