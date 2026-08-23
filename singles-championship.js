(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoveSinglesChampionship = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DIVISIONS = ['men', 'women'];
  const COURT_COUNT = 6;
  const STATUS = ['Waiting', 'Ready', 'Playing', 'Finished'];
  const ROUND_META = {
    qf: { label: 'QF', title: 'Quarterfinals' },
    sf: { label: 'SF', title: 'Semifinals' },
    final: { label: 'Final', title: 'Final' }
  };
  const DIVISION_META = {
    men: { title: "Men's Draw", short: 'Men', accent: 'phoenix' },
    women: { title: "Women's Draw", short: 'Women', accent: 'griffin' }
  };
  const PLAYER_LABELS = {
    men: ['Men 1', 'Men 2', 'Men 3', 'Men 4', 'Men 5', 'Men 6', 'Men 7', 'Men 8'],
    women: ['Women 1', 'Women 2', 'Women 3', 'Women 4', 'Women 5', 'Women 6', 'Women 7', 'Women 8']
  };
  const MATCH_ORDER = [
    { division: 'men', id: 'men-qf-1', round: 'qf', index: 1 },
    { division: 'men', id: 'men-qf-2', round: 'qf', index: 2 },
    { division: 'men', id: 'men-qf-3', round: 'qf', index: 3 },
    { division: 'men', id: 'men-qf-4', round: 'qf', index: 4 },
    { division: 'women', id: 'women-qf-1', round: 'qf', index: 1 },
    { division: 'women', id: 'women-qf-2', round: 'qf', index: 2 },
    { division: 'women', id: 'women-qf-3', round: 'qf', index: 3 },
    { division: 'women', id: 'women-qf-4', round: 'qf', index: 4 },
    { division: 'men', id: 'men-sf-1', round: 'sf', index: 1 },
    { division: 'women', id: 'women-sf-1', round: 'sf', index: 1 },
    { division: 'men', id: 'men-sf-2', round: 'sf', index: 2 },
    { division: 'women', id: 'women-sf-2', round: 'sf', index: 2 },
    { division: 'men', id: 'men-final', round: 'final', index: 1 },
    { division: 'women', id: 'women-final', round: 'final', index: 1 }
  ];

  function seedId(division, index) {
    return `${division}-seed-${index}`;
  }

  function qfId(division, index) {
    return `${division}-qf-${index}`;
  }

  function sfId(division, index) {
    return `${division}-sf-${index}`;
  }

  function createPlayers(division) {
    return PLAYER_LABELS[division].map((name, index) => ({
      id: seedId(division, index + 1),
      name
    }));
  }

  function playerSlot(division, index) {
    return { source: 'seed', playerId: seedId(division, index) };
  }

  function winnerSlot(matchId) {
    return { source: 'winner', matchId };
  }

  function baseMatches(division) {
    return [
      { id: qfId(division, 1), division, round: 'qf', index: 1, slots: [playerSlot(division, 1), playerSlot(division, 8)], court: division === 'men' ? 1 : 4, status: 'Ready' },
      { id: qfId(division, 2), division, round: 'qf', index: 2, slots: [playerSlot(division, 4), playerSlot(division, 5)], court: division === 'men' ? 2 : 5, status: 'Ready' },
      { id: qfId(division, 3), division, round: 'qf', index: 3, slots: [playerSlot(division, 3), playerSlot(division, 6)], court: division === 'men' ? 3 : 6, status: 'Ready' },
      { id: qfId(division, 4), division, round: 'qf', index: 4, slots: [playerSlot(division, 2), playerSlot(division, 7)], court: '', status: 'Waiting' },
      { id: sfId(division, 1), division, round: 'sf', index: 1, slots: [winnerSlot(qfId(division, 1)), winnerSlot(qfId(division, 2))], court: '', status: 'Waiting' },
      { id: sfId(division, 2), division, round: 'sf', index: 2, slots: [winnerSlot(qfId(division, 3)), winnerSlot(qfId(division, 4))], court: '', status: 'Waiting' },
      { id: `${division}-final`, division, round: 'final', index: 1, slots: [winnerSlot(sfId(division, 1)), winnerSlot(sfId(division, 2))], court: '', status: 'Waiting' }
    ];
  }

  function defaultEvent() {
    return {
      id: '2026-singles-championship',
      updatedAt: 0,
      players: {
        men: createPlayers('men'),
        women: createPlayers('women')
      },
      matches: DIVISIONS.flatMap(baseMatches)
    };
  }

  function matchTemplate(match) {
    return {
      id: match.id,
      division: match.division,
      round: match.round,
      index: match.index,
      slots: match.slots,
      court: match.court || '',
      status: STATUS.includes(match.status) ? match.status : 'Waiting',
      scoreA: match.scoreA === undefined ? '' : String(match.scoreA),
      scoreB: match.scoreB === undefined ? '' : String(match.scoreB),
      tiebreak: match.tiebreak || '',
      winnerId: match.winnerId || '',
      startedAt: Number(match.startedAt) || 0,
      finishedAt: Number(match.finishedAt) || 0,
      note: match.note || ''
    };
  }

  function normalizeEvent(raw) {
    const base = defaultEvent();
    const data = raw && typeof raw === 'object' ? raw : {};
    const players = {};
    DIVISIONS.forEach((division) => {
      const incoming = data.players && Array.isArray(data.players[division]) ? data.players[division] : [];
      players[division] = base.players[division].map((player, index) => {
        const item = incoming[index] || {};
        return { id: player.id, name: String(item.name || player.name).trim() || player.name };
      });
    });
    const byId = new Map((Array.isArray(data.matches) ? data.matches : []).map(match => [match && match.id, match]));
    const matches = base.matches.map((match) => matchTemplate({ ...match, ...(byId.get(match.id) || {}) }));
    return { id: data.id || base.id, updatedAt: Number(data.updatedAt) || 0, players, matches: promoteReady(matches, players) };
  }

  function playerName(eventData, playerId) {
    for (const division of DIVISIONS) {
      const player = eventData.players[division].find(item => item.id === playerId);
      if (player) return player.name;
    }
    return '';
  }

  function matchById(eventData, matchId) {
    return eventData.matches.find(match => match.id === matchId) || null;
  }

  function resolveSlot(eventData, slot) {
    if (!slot) return null;
    if (slot.source === 'seed') {
      const name = playerName(eventData, slot.playerId);
      return name ? { id: slot.playerId, name } : null;
    }
    if (slot.source === 'winner') {
      const source = matchById(eventData, slot.matchId);
      if (!source || !source.winnerId) return null;
      return { id: source.winnerId, name: playerName(eventData, source.winnerId) };
    }
    return null;
  }

  function competitors(eventData, match) {
    return match.slots.map(slot => resolveSlot(eventData, slot));
  }

  function dependenciesReady(eventData, match) {
    return competitors(eventData, match).every(Boolean);
  }

  function promoteReady(matches, players) {
    const eventData = { players, matches };
    matches.forEach((match) => {
      if (match.status === 'Finished' || match.status === 'Playing') return;
      match.status = dependenciesReady(eventData, match) ? 'Ready' : 'Waiting';
    });
    return matches;
  }

  function normalizeScoreValue(value) {
    if (value === '') return '';
    const number = Math.max(0, Math.min(6, Number(value)));
    return Number.isFinite(number) ? String(number) : '';
  }

  function updatePlayer(eventData, division, index, name) {
    const next = normalizeEvent(eventData);
    if (!next.players[division] || !next.players[division][index]) return next;
    next.players[division][index].name = String(name || '').trim() || PLAYER_LABELS[division][index];
    return normalizeEvent(next);
  }

  function updateMatch(eventData, matchId, patch) {
    const next = normalizeEvent(eventData);
    const match = matchById(next, matchId);
    if (!match) return next;
    Object.keys(patch || {}).forEach((key) => {
      if (key === 'court') match.court = patch[key] === '' ? '' : Math.max(1, Math.min(COURT_COUNT, Number(patch[key])));
      else if (key === 'scoreA' || key === 'scoreB') match[key] = normalizeScoreValue(patch[key]);
      else if (key === 'status' && STATUS.includes(patch[key])) match.status = patch[key];
      else if (key === 'winnerId') match.winnerId = patch[key] || '';
      else if (key === 'tiebreak' || key === 'note') match[key] = String(patch[key] || '');
      else if (key === 'startedAt' || key === 'finishedAt') match[key] = Number(patch[key]) || 0;
    });
    if (match.status !== 'Finished') {
      match.winnerId = '';
      match.finishedAt = 0;
    }
    return normalizeEvent(next);
  }

  function startMatch(eventData, matchId, court, now = Date.now()) {
    return updateMatch(eventData, matchId, { status: 'Playing', court: court || matchById(eventData, matchId)?.court || '', startedAt: now });
  }

  function finishMatch(eventData, matchId, winnerId, scoreA, scoreB, tiebreak, now = Date.now()) {
    return updateMatch(eventData, matchId, {
      status: 'Finished',
      winnerId,
      scoreA,
      scoreB,
      tiebreak,
      finishedAt: now
    });
  }

  function resetEvent() {
    return defaultEvent();
  }

  function orderedMatches(eventData) {
    const order = new Map(MATCH_ORDER.map((item, index) => [item.id, index]));
    return eventData.matches.slice().sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0));
  }

  function courtBoard(eventData) {
    return Array.from({ length: COURT_COUNT }, (_, index) => {
      const court = index + 1;
      const playing = orderedMatches(eventData).find(match => Number(match.court) === court && match.status === 'Playing');
      const assigned = orderedMatches(eventData).find(match => Number(match.court) === court && match.status === 'Ready');
      return { court, current: playing || assigned || null, mode: playing ? 'Playing' : assigned ? 'Ready' : 'Free Play' };
    });
  }

  function nextUp(eventData) {
    return orderedMatches(eventData).filter(match => match.status === 'Ready' && !match.court);
  }

  function summary(eventData) {
    const total = eventData.matches.length;
    const finished = eventData.matches.filter(match => match.status === 'Finished').length;
    const playing = eventData.matches.filter(match => match.status === 'Playing').length;
    const ready = eventData.matches.filter(match => match.status === 'Ready').length;
    const champions = {};
    DIVISIONS.forEach((division) => {
      const final = matchById(eventData, `${division}-final`);
      champions[division] = final && final.winnerId ? playerName(eventData, final.winnerId) : '';
    });
    return { total, finished, playing, ready, champions };
  }

  return {
    COURT_COUNT,
    STATUS,
    DIVISIONS,
    DIVISION_META,
    ROUND_META,
    defaultEvent,
    normalizeEvent,
    competitors,
    dependenciesReady,
    matchById,
    orderedMatches,
    courtBoard,
    nextUp,
    summary,
    updatePlayer,
    updateMatch,
    startMatch,
    finishMatch,
    resetEvent
  };
}));
