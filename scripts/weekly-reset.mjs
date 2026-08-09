import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const TIME_ZONE = 'America/Toronto';
const DEFAULT_DATABASE_URL = 'https://dovecupdatabase-default-rtdb.firebaseio.com/doveCupWaitlistSystem.json';
const MAX_ATTEMPTS = 5;

function zonedParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

export function latestEligibleResetId(now = new Date()) {
  const parts = zonedParts(now);
  const weekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
  let daysSinceSaturday = (weekday - 6 + 7) % 7;
  if (daysSinceSaturday === 0 && Number(parts.hour) < 19) daysSinceSaturday = 7;

  const localDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceSaturday);
  return localDate.toISOString().slice(0, 10);
}

export function normalizeName(name) {
  return String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-CA');
}

function playerKey(name) {
  return `p_${createHash('sha256').update(normalizeName(name)).digest('hex').slice(0, 24)}`;
}

export function scoreKeyForName(name) {
  return String(name || '').trim().toLocaleLowerCase('en-CA').replace(/[.#$/[\]]/g, '_');
}

function cleanPerson(person) {
  return {
    id: person.id ?? null,
    name: String(person.name || '').trim(),
    levelGroup: person.levelGroup || '20_25',
    confirmed: Boolean(person.confirmed),
    paid: Boolean(person.paid),
    registeredAt: Number(person.ts) || null
  };
}

function updatePlayerStat(stats, person, kind, resetId, archivedAt) {
  const normalizedName = normalizeName(person.name);
  if (!normalizedName) return null;

  const key = playerKey(person.name);
  const previous = stats[key] || {};
  const name = String(person.name || '').trim();
  const aliases = Array.isArray(previous.aliases) ? previous.aliases.slice(0, 4) : [];
  if (previous.name && previous.name !== name && !aliases.includes(previous.name)) aliases.unshift(previous.name);
  const registeredAt = Number(person.ts) || archivedAt;

  const next = {
    ...previous,
    name,
    normalizedName,
    aliases,
    signupCount: Number(previous.signupCount) || 0,
    waitlistCount: Number(previous.waitlistCount) || 0,
    levelCounts: { ...(previous.levelCounts || {}) },
    updatedAt: archivedAt
  };

  if (kind === 'joined') {
    next.signupCount += 1;
    next.levelCounts[person.levelGroup || '20_25'] = (Number(next.levelCounts[person.levelGroup || '20_25']) || 0) + 1;
    next.firstSignupAt = Number(previous.firstSignupAt) || registeredAt;
    next.lastSignupAt = registeredAt;
    next.lastSignupWeek = resetId;
  } else {
    next.waitlistCount += 1;
    next.lastWaitlistAt = registeredAt;
    next.lastWaitlistWeek = resetId;
  }

  stats[key] = next;
  return key;
}

function recordAttendance(system, people, resetId, recordedAt) {
  const scores = system.scores && typeof system.scores === 'object' ? system.scores : {};
  const players = scores.players && typeof scores.players === 'object' ? scores.players : {};
  const events = Array.isArray(scores.events) ? scores.events : [];
  const attendanceWeeks = scores.attendanceWeeks && typeof scores.attendanceWeeks === 'object'
    ? scores.attendanceWeeks
    : {};

  if (attendanceWeeks[resetId]) {
    return { changed: false, count: Number(attendanceWeeks[resetId].count) || 0 };
  }

  const names = [];
  const seen = new Set();
  (Array.isArray(people) ? people : []).forEach(person => {
    const name = String(person?.name || '').trim();
    const key = scoreKeyForName(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    names.push(name);

    const existing = players[key] || {
      key,
      name,
      appearances: 0
    };
    existing.key = key;
    existing.name = name;
    existing.appearances = (Number(existing.appearances) || 0) + 1;
    delete existing.manualWins;
    delete existing.courtWins;
    delete existing.wins;
    delete existing.points;
    existing.lastPlayedAt = recordedAt;
    existing.lastAttendanceWeek = resetId;
    existing.updatedAt = recordedAt;
    players[key] = existing;
  });

  attendanceWeeks[resetId] = {
    resetId,
    count: names.length,
    names,
    recordedAt,
    source: 'weekly-signup-archive'
  };
  events.unshift({ type: 'weeklyAttendance', resetId, names, count: names.length, ts: recordedAt });
  system.scores = {
    ...scores,
    players,
    events: events.slice(0, 20),
    attendanceWeeks,
    mode: 'attendance-only',
    updatedAt: recordedAt
  };
  return { changed: true, count: names.length };
}

export function buildAttendanceOnlyMigration(input, now = new Date()) {
  const system = JSON.parse(JSON.stringify(input || {}));
  const scores = system.scores && typeof system.scores === 'object' ? system.scores : {};
  const players = scores.players && typeof scores.players === 'object' ? scores.players : {};
  const events = Array.isArray(scores.events) ? scores.events : [];
  let playersCleared = 0;

  Object.values(players).forEach(player => {
    if (!player || typeof player !== 'object') return;
    const hadCompetitionStats = ['manualWins', 'courtWins', 'wins', 'points']
      .some(field => Object.hasOwn(player, field));
    if (hadCompetitionStats) playersCleared += 1;
    delete player.manualWins;
    delete player.courtWins;
    delete player.wins;
    delete player.points;
  });

  const cleanEvents = events.filter(event => !['wins', 'courtScores'].includes(event?.type));
  const alreadyAttendanceOnly = scores.mode === 'attendance-only'
    && playersCleared === 0
    && cleanEvents.length === events.length;
  if (alreadyAttendanceOnly) {
    return {
      changed: false,
      data: system,
      summary: { reason: 'already-attendance-only', playersCleared: 0 }
    };
  }

  const migratedAt = now.getTime();
  cleanEvents.unshift({ type: 'attendanceOnly', names: [], ts: migratedAt });
  system.scores = {
    ...scores,
    players,
    events: cleanEvents.slice(0, 20),
    mode: 'attendance-only',
    updatedAt: migratedAt
  };
  return {
    changed: true,
    data: system,
    summary: { reason: 'attendance-only-migration', playersCleared }
  };
}

export function buildReset(input, resetId, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resetId)) throw new Error(`Invalid reset id: ${resetId}`);

  const system = JSON.parse(JSON.stringify(input || {}));
  const history = system.signupHistory && typeof system.signupHistory === 'object' ? system.signupHistory : {};
  if (history[resetId] || system.weeklyReset?.lastResetId === resetId) {
    const attendance = history[resetId]
      ? recordAttendance(system, history[resetId].joined, resetId, now.getTime())
      : { changed: false, count: 0 };
    return {
      changed: attendance.changed,
      data: system,
      summary: {
        resetId,
        reason: attendance.changed ? 'attendance-backfilled' : 'already-archived',
        attendanceRecorded: attendance.count
      }
    };
  }

  const main = system.main && typeof system.main === 'object' ? system.main : {};
  const state = main.state && typeof main.state === 'object' ? main.state : {};
  const joined = Array.isArray(state.joined) ? state.joined.filter(person => normalizeName(person?.name)) : [];
  const waitlist = Array.isArray(state.waitlist) ? state.waitlist.filter(person => normalizeName(person?.name)) : [];
  const archivedAt = now.getTime();
  const stats = system.signupStats && typeof system.signupStats === 'object' ? system.signupStats : {};

  const joinedKeys = new Set();
  joined.forEach(person => {
    const key = playerKey(person.name);
    if (joinedKeys.has(key)) return;
    joinedKeys.add(key);
    updatePlayerStat(stats, person, 'joined', resetId, archivedAt);
  });

  const waitlistKeys = new Set();
  waitlist.forEach(person => {
    const key = playerKey(person.name);
    if (joinedKeys.has(key) || waitlistKeys.has(key)) return;
    waitlistKeys.add(key);
    updatePlayerStat(stats, person, 'waitlist', resetId, archivedAt);
  });

  history[resetId] = {
    resetId,
    scheduledFor: `${resetId}T19:00:00[${TIME_ZONE}]`,
    archivedAt,
    title: state.title || '金鸽杯报名接龙',
    capacity: state.capacity ?? null,
    joinedCount: joined.length,
    waitlistCount: waitlist.length,
    joined: joined.map(cleanPerson),
    waitlist: waitlist.map(cleanPerson)
  };
  const attendance = recordAttendance(system, joined, resetId, archivedAt);

  system.main = {
    ...main,
    state: {
      ...state,
      title: state.title || '金鸽杯报名接龙',
      capacity: state.capacity ?? null,
      joined: [],
      waitlist: []
    },
    updatedAt: archivedAt
  };
  system.signupHistory = history;
  system.signupStats = stats;
  system.weeklyReset = {
    ...(system.weeklyReset || {}),
    lastResetId: resetId,
    lastResetAt: archivedAt,
    timezone: TIME_ZONE,
    archiveHour: 19
  };

  return {
    changed: true,
    data: system,
    summary: {
      resetId,
      joinedArchived: joined.length,
      waitlistArchived: waitlist.length,
      uniqueSignupsCounted: joinedKeys.size,
      attendanceRecorded: attendance.count,
      trackedPlayers: Object.keys(stats).length
    }
  };
}

async function fetchSnapshot(databaseUrl) {
  const response = await fetch(databaseUrl, { headers: { 'X-Firebase-ETag': 'true' } });
  if (!response.ok) throw new Error(`Firebase read failed: ${response.status} ${await response.text()}`);
  return { etag: response.headers.get('etag'), data: await response.json() };
}

async function run() {
  const databaseUrl = process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL;
  const resetIdArgIndex = process.argv.indexOf('--reset-id');
  const resetIdArg = resetIdArgIndex >= 0 ? process.argv[resetIdArgIndex + 1] : '';
  const resetId = process.env.RESET_ID || resetIdArg || latestEligibleResetId();
  const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true' || process.argv.includes('--dry-run');
  const attendanceOnlyMigration = process.argv.includes('--attendance-only');

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const snapshot = await fetchSnapshot(databaseUrl);
    if (!snapshot.etag) throw new Error('Firebase did not return an ETag; refusing to overwrite data without concurrency protection.');

    const result = attendanceOnlyMigration
      ? buildAttendanceOnlyMigration(snapshot.data)
      : buildReset(snapshot.data, resetId);
    if (!result.changed) {
      console.log(JSON.stringify(result.summary));
      return;
    }
    if (dryRun) {
      console.log(JSON.stringify({ ...result.summary, dryRun: true }));
      return;
    }

    const response = await fetch(databaseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': snapshot.etag
      },
      body: JSON.stringify(result.data)
    });

    if (response.status === 412) {
      console.log(`Firebase changed during reset; retrying (${attempt}/${MAX_ATTEMPTS}).`);
      continue;
    }
    if (!response.ok) throw new Error(`Firebase write failed: ${response.status} ${await response.text()}`);

    console.log(JSON.stringify(result.summary));
    return;
  }

  throw new Error(`Weekly reset could not obtain a stable Firebase snapshot after ${MAX_ATTEMPTS} attempts.`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
