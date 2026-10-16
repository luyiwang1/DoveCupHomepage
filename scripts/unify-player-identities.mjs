import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import '../player-identity.js';

const identity = globalThis.DovePlayerIdentity;
const list = value => Array.isArray(value) ? value : [];
const legacyKey = name => String(name || '').trim().toLowerCase().replace(/[.#$/[\]]/g, '_');
const statKey = name => `p_${createHash('sha256').update(identity.key(name)).digest('hex').slice(0, 24)}`;
const MIGRATION = 'confirmed-player-identities-v1';

function overlapCounts(records, field) {
  const overlaps = new Map();
  Object.values(records || {}).forEach(record => {
    if (!field && !Number(record.count)) return;
    const names = field ? list(record[field]).map(p => p.name) : list(record.names);
    const groups = new Map();
    names.forEach(name => {
      const key = identity.scoreKey(name);
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(legacyKey(name));
    });
    groups.forEach((oldKeys, key) => overlaps.set(key, (overlaps.get(key) || 0) + oldKeys.size - 1));
  });
  return overlaps;
}

function rewriteNames(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.name === 'string') {
    const canonical = identity.canonicalName(value.name);
    if (canonical !== value.name) {
      value.originalName = value.originalName || value.name;
      value.name = canonical;
    }
  }
  if (Array.isArray(value.names)) {
    const originalLength = value.names.length;
    value.names = [...new Set(value.names.map(identity.canonicalName))];
    if (Number(value.count) === originalLength) value.count = value.names.length;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (!['originalName', 'aliases'].includes(key)) rewriteNames(child);
  });
}

function mergeRoster(main) {
  if (!main?.state) return;
  const seen = new Map();
  for (const field of ['joined', 'waitlist']) {
    if (!Array.isArray(main.state[field])) continue;
    main.state[field] = main.state[field].filter(person => {
      const key = identity.key(person.name);
      if (!seen.has(key)) { seen.set(key, person); return true; }
      const kept = seen.get(key);
      kept.confirmed = Boolean(kept.confirmed || person.confirmed);
      kept.paid = Boolean(kept.paid || person.paid);
      return false;
    });
  }
}

export function buildIdentityMigration(input, now = Date.now()) {
  if (input.identityMigrations?.[MIGRATION]) return { changed: false, data: input, summary: { alreadyApplied: true } };
  const data = structuredClone(input);
  const scores = data.scores || { players: {} };
  const overlaps = overlapCounts({ ...scores.attendanceWeeks, ...scores.attendanceEvents });
  const players = {};
  const changes = [];
  Object.entries(scores.players || {}).forEach(([oldKey, player]) => {
    const key = identity.scoreKey(player.name);
    const name = identity.canonicalName(player.name);
    const previous = players[key];
    if (oldKey !== key || player.name !== name) changes.push({ from: player.name, to: name, appearances: Number(player.appearances) || 0 });
    const recent = previous && Number(previous.lastPlayedAt) > Number(player.lastPlayedAt) ? previous : player;
    players[key] = {
      ...player, ...recent, key, name,
      appearances: (Number(previous?.appearances) || 0) + (Number(player.appearances) || 0),
      aliases: [...new Set([...list(previous?.aliases), ...list(player.aliases), player.name])],
      updatedAt: now
    };
  });
  overlaps.forEach((count, key) => {
    if (players[key]) players[key].appearances = Math.max(0, players[key].appearances - count);
  });
  data.scores = { ...scores, players, updatedAt: now };

  const stats = {};
  Object.values(data.signupStats || {}).forEach(stat => {
    const key = statKey(stat.name), previous = stats[key];
    const recent = previous && Number(previous.lastSignupAt) > Number(stat.lastSignupAt) ? previous : stat;
    const levelCounts = { ...previous?.levelCounts };
    Object.entries(stat.levelCounts || {}).forEach(([level, count]) => { levelCounts[level] = (Number(levelCounts[level]) || 0) + (Number(count) || 0); });
    stats[key] = {
      ...stat, ...recent, name: identity.canonicalName(stat.name), normalizedName: identity.key(stat.name),
      signupCount: (Number(previous?.signupCount) || 0) + (Number(stat.signupCount) || 0),
      waitlistCount: (Number(previous?.waitlistCount) || 0) + (Number(stat.waitlistCount) || 0),
      firstSignupAt: Math.min(...[previous?.firstSignupAt, stat.firstSignupAt].filter(v => Number(v) > 0)),
      aliases: [...new Set([...list(previous?.aliases), ...list(stat.aliases), stat.name])],
      levelCounts, updatedAt: now
    };
    if (!Number.isFinite(stats[key].firstSignupAt)) delete stats[key].firstSignupAt;
  });
  data.signupStats = stats;
  rewriteNames(data);
  mergeRoster(data.main);
  Object.values(data.venues || {}).forEach(venue => mergeRoster(venue.main));
  data.identityMigrations = { ...data.identityMigrations, [MIGRATION]: { appliedAt: now, changes } };
  return { changed: true, data, summary: { changes, playersBefore: Object.keys(scores.players || {}).length, playersAfter: Object.keys(players).length, appearancesAfter: Object.values(players).reduce((sum, p) => sum + p.appearances, 0) } };
}

export function prepareVenueData(input, now = Date.now()) {
  const data = structuredClone(input);
  if (data.venues?.['nyta-east']?.enabledFrom && data.venues['nyta-east'].main) return { changed: false, data };
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const saturday = new Date(`${localDate}T12:00:00Z`);
  saturday.setUTCDate(saturday.getUTCDate() + (6 - saturday.getUTCDay() + 7) % 7);
  data.venues = { ...data.venues, 'nyta-east': {
    ...data.venues?.['nyta-east'],
    enabledFrom: saturday.toISOString().slice(0, 10),
    main: data.venues?.['nyta-east']?.main || { idSeq: 1, state: { title: 'NYTA East Bubble · 报名接龙', capacity: 12, joined: [], waitlist: [] }, updatedAt: now }
  } };
  return { changed: true, data };
}

async function run() {
  const url = 'https://dovecupdatabase-default-rtdb.firebaseio.com/doveCupWaitlistSystem.json';
  const response = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' } });
  assert.ok(response.ok, `Read failed: ${response.status}`);
  const etag = response.headers.get('etag');
  assert.ok(etag, 'Missing concurrency token');
  const before = await response.json();
  const result = buildIdentityMigration(before);
  if (process.argv.includes('--enable-venues')) {
    const venues = prepareVenueData(result.data);
    result.data = venues.data;
    result.changed = result.changed || venues.changed;
    result.summary.nytaInitialized = venues.changed;
  }
  console.log(JSON.stringify({ dryRun: !process.argv.includes('--apply'), ...result.summary }, null, 2));
  if (!result.changed || !process.argv.includes('--apply')) return;
  assert.ok(process.env.DOVE_BACKUP_DIR, 'DOVE_BACKUP_DIR must point outside the public website');
  await mkdir(process.env.DOVE_BACKUP_DIR, { recursive: true });
  const backup = `${process.env.DOVE_BACKUP_DIR}/identities-${Date.now()}.json`;
  await writeFile(backup, JSON.stringify(before, null, 2), { flag: 'wx' });
  const saved = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': etag }, body: JSON.stringify(result.data) });
  assert.ok(saved.ok, `Write failed: ${saved.status}; reread data before retrying`);
  const verified = await fetch(url).then(r => r.json());
  assert.ok(verified.identityMigrations?.[MIGRATION]);
  assert.equal(Object.keys(verified.scores.players).length, Object.keys(result.data.scores.players).length);
  Object.entries(result.data.scores.players).forEach(([key, player]) => assert.equal(verified.scores.players[key]?.appearances, player.appearances));
  console.log(JSON.stringify({ verified: true, backup }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) run().catch(error => { console.error(error); process.exitCode = 1; });
