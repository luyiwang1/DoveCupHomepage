import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReset, latestEligibleResetId, normalizeName } from './weekly-reset.mjs';

test('finds the latest Saturday 20:00 cutoff in Toronto', () => {
  assert.equal(latestEligibleResetId(new Date('2026-08-02T00:01:00Z')), '2026-08-01');
  assert.equal(latestEligibleResetId(new Date('2026-08-01T23:59:00Z')), '2026-07-25');
  assert.equal(latestEligibleResetId(new Date('2026-12-06T01:05:00Z')), '2026-12-05');
});

test('normalizes names before counting', () => {
  assert.equal(normalizeName('  Irene   WANG '), 'irene wang');
});

test('archives both lists, counts joined players once, and clears the signup form', () => {
  const input = {
    main: {
      idSeq: 14,
      state: {
        title: '金鸽杯报名接龙',
        capacity: 16,
        joined: [
          { id: 1, name: 'Irene', levelGroup: '25_30', paid: true, ts: 100 },
          { id: 2, name: ' irene ', levelGroup: '25_30', ts: 200 },
          { id: 3, name: 'Gill', levelGroup: '30_plus', ts: 300 }
        ],
        waitlist: [{ id: 4, name: 'Alvin', levelGroup: '20_25', ts: 400 }]
      }
    },
    scores: { players: { existing: { points: 50 } } }
  };

  const result = buildReset(input, '2026-08-01', new Date('2026-08-02T00:05:00Z'));
  assert.equal(result.changed, true);
  assert.deepEqual(result.data.main.state.joined, []);
  assert.deepEqual(result.data.main.state.waitlist, []);
  assert.equal(result.data.signupHistory['2026-08-01'].joinedCount, 3);
  assert.equal(result.data.signupHistory['2026-08-01'].waitlistCount, 1);
  assert.equal(result.summary.uniqueSignupsCounted, 2);
  assert.equal(Object.values(result.data.signupStats).find(player => player.normalizedName === 'irene').signupCount, 1);
  assert.equal(Object.values(result.data.signupStats).find(player => player.normalizedName === 'alvin').waitlistCount, 1);
  assert.equal(result.data.scores.players.existing.points, 50);
});

test('does not archive or count the same week twice', () => {
  const first = buildReset({ main: { state: { joined: [{ name: 'Gill' }], waitlist: [] } } }, '2026-08-01');
  const second = buildReset(first.data, '2026-08-01');
  assert.equal(second.changed, false);
  assert.equal(Object.values(second.data.signupStats)[0].signupCount, 1);
});
