const assert = require('node:assert/strict');
const test = require('node:test');

require('../team-event-calculator.js');
require('../team-event-archive.js');

const archive = globalThis.DoveTeamEventArchive;

function eventSystem() {
  return {
    scores: {
      mode: 'attendance-only',
      players: {
        alice: { key: 'alice', name: 'Alice', appearances: 2 }
      },
      attendanceWeeks: {
        '2026-08-08': { count: 1 }
      },
      events: []
    },
    teamEvents: {
      '2026-08-08-mixed-team': {
        title: 'Phoenix vs Griffin',
        venue: 'MRTC',
        date: '2026-08-08',
        registrations: [
          { id: 'a', name: 'Alice', team: 'phoenix', gender: 'female' },
          { id: 'a2', name: ' alice ', team: 'phoenix', gender: 'female' },
          { id: 'b', name: 'Bob', team: 'griffin', gender: 'male' }
        ],
        teams: {
          phoenix: { pairs: [{ player1: '', player2: 'Alice' }] },
          griffin: { pairs: [{ player1: 'Bob', player2: '' }] }
        },
        rounds: [{
          id: 'r1',
          matches: [{ phoenixGames: 6, griffinGames: 4 }]
        }]
      }
    }
  };
}

test('archives a complete team event and records each attendee once', () => {
  const archivedAt = Date.parse('2026-08-08T23:00:00Z');
  const result = archive.buildArchive(eventSystem(), '2026-08-08-mixed-team', archivedAt);

  assert.equal(result.changed, true);
  assert.equal(result.summary.attendanceRecorded, 2);
  assert.equal(result.data.teamEvents['2026-08-08-mixed-team'].status, 'archived');
  assert.equal(result.data.scores.players.alice.appearances, 3);
  assert.equal(result.data.scores.players.bob.appearances, 1);
  assert.equal(result.data.scores.attendanceWeeks['2026-08-08'].count, 1);
  assert.equal(result.data.scores.attendanceEvents['2026-08-08-mixed-team'].count, 2);
  assert.equal(result.data.scores.events[0].type, 'specialEventAttendance');

  const snapshot = result.data.eventArchives['2026-08-08-mixed-team'];
  assert.equal(snapshot.registrations.length, 2);
  assert.equal(snapshot.teams.phoenix.pairs[0].player2, 'Alice');
  assert.equal(snapshot.rounds[0].matches[0].phoenixGames, 6);
  assert.equal(snapshot.finalResult.phoenix.teamPoints, 1);
});

test('does not add attendance twice when the same event is archived again', () => {
  const first = archive.buildArchive(eventSystem(), '2026-08-08-mixed-team', 1000);
  const second = archive.buildArchive(first.data, '2026-08-08-mixed-team', 2000);

  assert.equal(second.changed, false);
  assert.equal(second.summary.reason, 'already-archived');
  assert.equal(second.data.scores.players.alice.appearances, 3);
  assert.equal(second.data.scores.players.bob.appearances, 1);
  assert.equal(second.data.scores.events.length, 1);
  assert.equal(second.data.eventArchives['2026-08-08-mixed-team'].archivedAt, 1000);
});

test('returns a safe no-op when the event cannot be found', () => {
  const result = archive.buildArchive({}, 'missing-event', 1000);
  assert.equal(result.changed, false);
  assert.equal(result.summary.reason, 'event-not-found');
});
