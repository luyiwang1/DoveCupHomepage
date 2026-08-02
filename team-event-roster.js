(function exposeRoster(root, factory) {
  const roster = factory();
  if (typeof module === 'object' && module.exports) module.exports = roster;
  root.DoveTeamRoster = roster;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createRoster() {
  const TEAMS = ['phoenix', 'griffin'];
  const GENDERS = ['male', 'female'];

  function cleanName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function nameKey(value) {
    return cleanName(value).toLocaleLowerCase('en-CA');
  }

  function normalizeRegistrations(value) {
    const source = Array.isArray(value) ? value : Object.values(value || {});
    const seen = new Set();
    return source.flatMap((item, index) => {
      const name = cleanName(item && item.name);
      const team = item && TEAMS.includes(item.team) ? item.team : null;
      const gender = item && GENDERS.includes(item.gender) ? item.gender : null;
      const key = nameKey(name);
      if (!name || !team || !gender || seen.has(key)) return [];
      seen.add(key);
      return [{
        id: String(item.id || `registration-${index + 1}`),
        name,
        team,
        gender,
        joinedAt: Number(item.joinedAt) || index + 1,
        ownerKey: String(item.ownerKey || '')
      }];
    });
  }

  function slotCount(registrations, team, gender) {
    return normalizeRegistrations(registrations)
      .filter(item => item.team === team && item.gender === gender).length;
  }

  function hasName(registrations, name) {
    const key = nameKey(name);
    return Boolean(key) && normalizeRegistrations(registrations).some(item => nameKey(item.name) === key);
  }

  function chooseTeam(registrations, gender, requestedTeam, capacity) {
    const limit = Number(capacity) > 0 ? Number(capacity) : 4;
    if (!GENDERS.includes(gender)) return null;
    if (TEAMS.includes(requestedTeam)) {
      return slotCount(registrations, requestedTeam, gender) < limit ? requestedTeam : null;
    }
    const ranked = TEAMS.map((team, index) => ({
      team,
      count: slotCount(registrations, team, gender),
      index
    })).filter(item => item.count < limit)
      .sort((a, b) => a.count - b.count || a.index - b.index);
    return ranked[0] ? ranked[0].team : null;
  }

  function teamPlayers(registrations, team, gender) {
    return normalizeRegistrations(registrations)
      .filter(item => item.team === team && (!gender || item.gender === gender))
      .sort((a, b) => a.joinedAt - b.joinedAt || a.name.localeCompare(b.name));
  }

  function buildPairs(registrations, team, pairIds) {
    const men = teamPlayers(registrations, team, 'male');
    const women = teamPlayers(registrations, team, 'female');
    return pairIds.map((id, index) => ({
      id,
      order: index + 1,
      player1: men[index] ? men[index].name : '',
      player2: women[index] ? women[index].name : ''
    }));
  }

  function deriveRegistrations(teams) {
    const registrations = [];
    TEAMS.forEach(team => {
      const pairs = teams && teams[team] && Array.isArray(teams[team].pairs)
        ? teams[team].pairs
        : [];
      pairs.forEach((pair, index) => {
        [['player1', 'male'], ['player2', 'female']].forEach(([field, gender], playerIndex) => {
          const name = cleanName(pair && pair[field]);
          if (!name || hasName(registrations, name)) return;
          registrations.push({
            id: `legacy-${team}-${index + 1}-${playerIndex + 1}`,
            name,
            team,
            gender,
            joinedAt: registrations.length + 1,
            ownerKey: ''
          });
        });
      });
    });
    return registrations;
  }

  return {
    buildPairs,
    chooseTeam,
    cleanName,
    deriveRegistrations,
    hasName,
    nameKey,
    normalizeRegistrations,
    slotCount,
    teamPlayers
  };
}));
