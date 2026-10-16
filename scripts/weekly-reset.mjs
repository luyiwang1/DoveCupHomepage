import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import '../player-identity.js';
import '../payments.js';

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
  if (daysSinceSaturday === 0 && Number(parts.hour) < 23) daysSinceSaturday = 7;

  const localDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceSaturday);
  return localDate.toISOString().slice(0, 10);
}

export function normalizeName(name) {
  return globalThis.DovePlayerIdentity.key(name);
}

function playerKey(name) {
  return `p_${createHash('sha256').update(normalizeName(name)).digest('hex').slice(0, 24)}`;
}

export function scoreKeyForName(name) {
  return globalThis.DovePlayerIdentity.scoreKey(name);
}

function cleanPerson(person) {
  return {
    id: person.id ?? null,
    name: globalThis.DovePlayerIdentity.canonicalName(person.name),
    levelGroup: person.levelGroup || '20_25',
    confirmed: Boolean(person.confirmed),
    paid: globalThis.DovePayments.status(person) === 'received',
    paymentStatus: globalThis.DovePayments.status(person),
    paymentPlan: person.paymentPlan || 'single',
    paymentAmount: Number(person.paymentAmount) || null,
    paymentSubmittedAt: Number(person.paymentSubmittedAt) || null,
    paymentVerifiedAt: Number(person.paymentVerifiedAt) || null,
    registeredAt: Number(person.ts) || null
  };
}

function updatePlayerStat(stats, person, kind, resetId, archivedAt) {
  const normalizedName = normalizeName(person.name);
  if (!normalizedName) return null;

  const key = playerKey(person.name);
  const previous = stats[key] || {};
  const name = globalThis.DovePlayerIdentity.canonicalName(person.name);
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

function recordAttendance(system, people, attendanceKey, recordedAt, metadata = {}) {
  const scores = system.scores && typeof system.scores === 'object' ? system.scores : {};
  const players = scores.players && typeof scores.players === 'object' ? scores.players : {};
  const events = Array.isArray(scores.events) ? scores.events : [];
  const attendanceWeeks = scores.attendanceWeeks && typeof scores.attendanceWeeks === 'object'
    ? scores.attendanceWeeks
    : {};

  if (attendanceWeeks[attendanceKey]) {
    return { changed: false, count: Number(attendanceWeeks[attendanceKey].count) || 0 };
  }

  const names = [];
  const seen = new Set();
  (Array.isArray(people) ? people : []).forEach(person => {
    const name = globalThis.DovePlayerIdentity.canonicalName(person?.name);
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
    existing.lastAttendanceWeek = metadata.resetId || attendanceKey;
    existing.updatedAt = recordedAt;
    players[key] = existing;
  });

  attendanceWeeks[attendanceKey] = {
    resetId: metadata.resetId || attendanceKey,
    attendanceKey,
    venueKey: metadata.venueKey || 'mrtc',
    venue: metadata.venue || 'MRTC',
    count: names.length,
    names,
    recordedAt,
    source: 'weekly-signup-archive'
  };
  events.unshift({ type: 'weeklyAttendance', resetId: metadata.resetId || attendanceKey, venueKey: metadata.venueKey || 'mrtc', venue: metadata.venue || 'MRTC', names, count: names.length, ts: recordedAt });
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

const VENUE_RESET_CONFIGS = [
  { key: 'mrtc', name: 'MRTC', capacity: 32, schedule: '周六 5–7 PM' },
  { key: 'nyta-east', name: 'NYTA East Bubble', capacity: 12, schedule: '周六 9–11 PM' }
];

function venueMain(system, venueKey) {
  if (venueKey === 'mrtc') return system.main && typeof system.main === 'object' ? system.main : {};
  return system.venues?.[venueKey]?.main && typeof system.venues[venueKey].main === 'object'
    ? system.venues[venueKey].main
    : {};
}

function venueIsEnabled(system, venueKey, resetId) {
  if (venueKey === 'mrtc') return true;
  const venue = system.venues?.[venueKey];
  return Boolean(venue?.main) && (!venue.enabledFrom || resetId >= venue.enabledFrom);
}

function saveClearedVenue(system, config, main, state, archivedAt) {
  const nextMain = {
    ...main,
    state: {
      ...state,
      title: state.title || `${config.name} · 报名接龙`,
      capacity: state.capacity ?? config.capacity,
      joined: [],
      waitlist: []
    },
    updatedAt: archivedAt
  };
  if (config.key === 'mrtc') {
    system.main = nextMain;
    delete system.courtsPage;
    return;
  }
  system.venues = system.venues && typeof system.venues === 'object' ? system.venues : {};
  system.venues[config.key] = { ...(system.venues[config.key] || {}), main: nextMain };
  delete system.venues[config.key].courtsPage;
}

export function buildReset(input, resetId, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resetId)) throw new Error(`Invalid reset id: ${resetId}`);

  const system = JSON.parse(JSON.stringify(input || {}));
  const history = system.signupHistory && typeof system.signupHistory === 'object' ? system.signupHistory : {};
  if (system.weeklyReset?.cancelledWeeks?.[resetId]) {
    return {
      changed: false,
      data: system,
      summary: { resetId, reason: 'event-cancelled', attendanceRecorded: 0 }
    };
  }

  const archivedAt = now.getTime();
  const stats = system.signupStats && typeof system.signupStats === 'object' ? system.signupStats : {};
  const totals = { joined: 0, waitlist: 0, unique: 0, attendance: 0, venues: 0 };
  let changed = false;
  let archivedAny = false;

  VENUE_RESET_CONFIGS.filter(config => venueIsEnabled(system, config.key, resetId)).forEach(config => {
    const archiveKey = config.key === 'mrtc' ? resetId : `${resetId}__${config.key}`;
    const attendanceKey = archiveKey;
    const existing = history[archiveKey];
    const metadata = { resetId, venueKey: config.key, venue: config.name };

    if (existing || (config.key === 'mrtc' && system.weeklyReset?.lastResetId === resetId)) {
      const attendance = existing
        ? recordAttendance(system, existing.joined, attendanceKey, archivedAt, metadata)
        : { changed: false, count: 0 };
      changed = changed || attendance.changed;
      totals.attendance += attendance.count;
      return;
    }

    const main = venueMain(system, config.key);
    const state = main.state && typeof main.state === 'object' ? main.state : {};
    const joined = Array.isArray(state.joined) ? state.joined.filter(person => normalizeName(person?.name)) : [];
    const waitlist = Array.isArray(state.waitlist) ? state.waitlist.filter(person => normalizeName(person?.name)) : [];
    const joinedKeys = new Set();
    const waitlistKeys = new Set();

    joined.forEach(person => {
      const key = playerKey(person.name);
      if (joinedKeys.has(key)) return;
      joinedKeys.add(key);
      updatePlayerStat(stats, person, 'joined', resetId, archivedAt);
    });
    waitlist.forEach(person => {
      const key = playerKey(person.name);
      if (joinedKeys.has(key) || waitlistKeys.has(key)) return;
      waitlistKeys.add(key);
      updatePlayerStat(stats, person, 'waitlist', resetId, archivedAt);
    });

    history[archiveKey] = {
      archiveKey,
      resetId,
      venueKey: config.key,
      venue: config.name,
      schedule: config.schedule,
      scheduledFor: `${resetId}T23:00:00[${TIME_ZONE}]`,
      archivedAt,
      title: state.title || `${config.name} · 报名接龙`,
      capacity: state.capacity ?? config.capacity,
      joinedCount: joined.length,
      waitlistCount: waitlist.length,
      joined: joined.map(cleanPerson),
      waitlist: waitlist.map(cleanPerson)
    };
    const attendance = recordAttendance(system, joined, attendanceKey, archivedAt, metadata);
    saveClearedVenue(system, config, main, state, archivedAt);

    totals.joined += joined.length;
    totals.waitlist += waitlist.length;
    totals.unique += joinedKeys.size;
    totals.attendance += attendance.count;
    totals.venues += 1;
    changed = true;
    archivedAny = true;
  });

  if (!changed) {
    return {
      changed: false,
      data: system,
      summary: { resetId, reason: 'already-archived', attendanceRecorded: totals.attendance }
    };
  }

  system.signupHistory = history;
  system.signupStats = stats;
  system.weeklyReset = {
    ...(system.weeklyReset || {}),
    lastResetId: resetId,
    lastResetAt: archivedAt,
    timezone: TIME_ZONE,
    archiveHour: 23
  };

  return {
    changed: true,
    data: system,
    summary: {
      resetId,
      reason: archivedAny ? 'archived' : 'attendance-backfilled',
      venuesArchived: totals.venues,
      joinedArchived: totals.joined,
      waitlistArchived: totals.waitlist,
      uniqueSignupsCounted: totals.unique,
      attendanceRecorded: totals.attendance,
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
