import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAttendanceOnlyMigration, buildReset, latestEligibleResetId, normalizeName, scoreKeyForName } from './weekly-reset.mjs';

test('finds the latest Saturday 20:00 cutoff in Toronto', () => {
  assert.equal(latestEligibleResetId(new Date('2026-08-02T00:01:00Z')), '2026-08-01');
  assert.equal(latestEligibleResetId(new Date('2026-08-01T23:59:00Z')), '2026-07-25');
  assert.equal(latestEligibleResetId(new Date('2026-12-06T01:05:00Z')), '2026-12-05');
});

test('normalizes names before counting', () => {
  assert.equal(normalizeName('  Irene   WANG '), 'irene wang');
  assert.equal(scoreKeyForName(' Rachel.Test '), 'rachel_test');
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
    scores: {
      players: {
        irene: { key: 'irene', name: 'Irene', appearances: 3, wins: 2, points: 70 }
      },
      events: []
    }
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
  assert.equal(result.data.scores.players.irene.appearances, 4);
  assert.equal('points' in result.data.scores.players.irene, false);
  assert.equal('wins' in result.data.scores.players.irene, false);
  assert.equal(result.data.scores.players.gill.appearances, 1);
  assert.equal('points' in result.data.scores.players.gill, false);
  assert.equal(result.data.scores.mode, 'attendance-only');
  assert.equal(result.data.scores.attendanceWeeks['2026-08-01'].count, 2);
  assert.equal(result.data.scores.events[0].type, 'weeklyAttendance');
});

test('does not archive or count the same week twice', () => {
  const first = buildReset({ main: { state: { joined: [{ name: 'Gill' }], waitlist: [] } } }, '2026-08-01');
  const second = buildReset(first.data, '2026-08-01');
  assert.equal(second.changed, false);
  assert.equal(Object.values(second.data.signupStats)[0].signupCount, 1);
});

test('backfills attendance from an existing archive exactly once', () => {
  const input = {
    main: { state: { joined: [], waitlist: [] } },
    signupHistory: {
      '2026-08-01': {
        resetId: '2026-08-01',
        joined: [{ name: 'Gill' }, { name: ' gill ' }, { name: 'Irene' }]
      }
    },
    weeklyReset: { lastResetId: '2026-08-01' },
    scores: { players: {}, events: [] }
  };

  const first = buildReset(input, '2026-08-01', new Date('2026-08-03T00:00:00Z'));
  assert.equal(first.changed, true);
  assert.equal(first.summary.reason, 'attendance-backfilled');
  assert.equal(first.summary.attendanceRecorded, 2);
  assert.equal(first.data.scores.players.gill.appearances, 1);

  const second = buildReset(first.data, '2026-08-01', new Date('2026-08-03T01:00:00Z'));
  assert.equal(second.changed, false);
  assert.equal(second.data.scores.players.gill.appearances, 1);
});

test('removes competition stats without changing attendance', () => {
  const input = {
    scores: {
      players: {
        irene: { key: 'irene', name: 'Irene', appearances: 4, wins: 2, points: 20 },
        gill: { key: 'gill', name: 'Gill', appearances: 2, manualWins: 1, courtWins: 3, wins: 4, points: 40 }
      },
      events: [
        { type: 'wins', ts: 1 },
        { type: 'courtScores', ts: 2 },
        { type: 'weeklyAttendance', ts: 3 }
      ],
      attendanceWeeks: { '2026-08-01': { count: 2 } }
    }
  };

  const first = buildAttendanceOnlyMigration(input, new Date('2026-08-03T00:00:00Z'));
  assert.equal(first.changed, true);
  assert.equal(first.summary.playersCleared, 2);
  assert.equal(first.data.scores.players.irene.appearances, 4);
  assert.equal(first.data.scores.players.gill.appearances, 2);
  assert.equal('points' in first.data.scores.players.irene, false);
  assert.equal('wins' in first.data.scores.players.gill, false);
  assert.equal(first.data.scores.events.some(event => event.type === 'wins' || event.type === 'courtScores'), false);
  assert.equal(first.data.scores.attendanceWeeks['2026-08-01'].count, 2);

  const second = buildAttendanceOnlyMigration(first.data, new Date('2026-08-03T01:00:00Z'));
  assert.equal(second.changed, false);
});
