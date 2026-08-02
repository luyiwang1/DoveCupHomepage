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
        ownerKey: String(item.ownerKey || ''),
        signupMode: item.signupMode === 'pair' && item.groupId ? 'pair' : 'single',
        groupId: item.signupMode === 'pair' && item.groupId ? String(item.groupId) : '',
        pairName: cleanName(item.pairName)
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

  function chooseTeam(registrations, gender, requestedTeam, capacity, randomValue) {
    const limit = Number(capacity) > 0 ? Number(capacity) : 4;
    if (!GENDERS.includes(gender)) return null;
    if (TEAMS.includes(requestedTeam)) {
      return slotCount(registrations, requestedTeam, gender) < limit ? requestedTeam : null;
    }
    const ranked = TEAMS.map(team => ({
      team,
      count: slotCount(registrations, team, gender)
    })).filter(item => item.count < limit);
    if (!ranked.length) return null;
    const lowest = Math.min(...ranked.map(item => item.count));
    const candidates = ranked.filter(item => item.count === lowest);
    const random = Number.isFinite(Number(randomValue)) ? Math.max(0, Math.min(0.999999, Number(randomValue))) : 0;
    return candidates[Math.floor(random * candidates.length)].team;
  }

  function choosePairTeam(registrations, requestedTeam, capacity, randomValue) {
    const limit = Number(capacity) > 0 ? Number(capacity) : 4;
    const available = TEAMS.filter(team => (
      slotCount(registrations, team, 'male') < limit
      && slotCount(registrations, team, 'female') < limit
    ));
    if (TEAMS.includes(requestedTeam)) return available.includes(requestedTeam) ? requestedTeam : null;
    if (!available.length) return null;
    const ranked = available.map(team => ({
      team,
      total: slotCount(registrations, team, 'male') + slotCount(registrations, team, 'female')
    }));
    const lowest = Math.min(...ranked.map(item => item.total));
    const candidates = ranked.filter(item => item.total === lowest);
    const random = Number.isFinite(Number(randomValue)) ? Math.max(0, Math.min(0.999999, Number(randomValue))) : 0;
    return candidates[Math.floor(random * candidates.length)].team;
  }

  function teamPlayers(registrations, team, gender) {
    return normalizeRegistrations(registrations)
      .filter(item => item.team === team && (!gender || item.gender === gender))
      .sort((a, b) => a.joinedAt - b.joinedAt || a.name.localeCompare(b.name));
  }

  function registrationGroups(registrations, team) {
    const groups = new Map();
    teamPlayers(registrations, team).forEach(item => {
      const key = item.signupMode === 'pair' && item.groupId ? `pair:${item.groupId}` : `single:${item.id}`;
      if (!groups.has(key)) groups.set(key, {
        id: key,
        signupMode: item.signupMode,
        groupId: item.groupId,
        pairName: item.pairName,
        joinedAt: item.joinedAt,
        members: []
      });
      const group = groups.get(key);
      group.members.push(item);
      group.joinedAt = Math.min(group.joinedAt, item.joinedAt);
      if (!group.pairName && item.pairName) group.pairName = item.pairName;
    });
    return [...groups.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  }

  function fixedPartnerGroups(registrations, team) {
    return registrationGroups(registrations, team).filter(group => {
      if (group.signupMode !== 'pair' || group.members.length !== 2) return false;
      const genders = new Set(group.members.map(item => item.gender));
      return genders.has('male') && genders.has('female');
    });
  }

  function buildPairs(registrations, team, pairIds) {
    const lockedGroups = fixedPartnerGroups(registrations, team).slice(0, pairIds.length);
    const usedIds = new Set(lockedGroups.flatMap(group => group.members.map(item => item.id)));
    const men = teamPlayers(registrations, team, 'male').filter(item => !usedIds.has(item.id));
    const women = teamPlayers(registrations, team, 'female').filter(item => !usedIds.has(item.id));
    return pairIds.map((id, index) => {
      const locked = lockedGroups[index];
      if (locked) {
        const man = locked.members.find(item => item.gender === 'male');
        const woman = locked.members.find(item => item.gender === 'female');
        return {
          id,
          order: index + 1,
          player1: man.name,
          player2: woman.name,
          lockedGroupId: locked.groupId,
          pairName: locked.pairName || ''
        };
      }
      const openIndex = index - lockedGroups.length;
      return {
      id,
      order: index + 1,
        player1: men[openIndex] ? men[openIndex].name : '',
        player2: women[openIndex] ? women[openIndex].name : '',
        lockedGroupId: '',
        pairName: ''
      };
    });
  }

  function linkedRegistrations(registrations, id) {
    const normalized = normalizeRegistrations(registrations);
    const item = normalized.find(entry => entry.id === id);
    if (!item) return [];
    if (item.signupMode !== 'pair' || !item.groupId) return [item];
    return normalized.filter(entry => entry.signupMode === 'pair' && entry.groupId === item.groupId);
  }

  function lockedPlayerNames(registrations, team) {
    return new Set(fixedPartnerGroups(registrations, team)
      .flatMap(group => group.members.map(item => item.name)));
  }

  function rosterSignature(registrations) {
    return JSON.stringify(normalizeRegistrations(registrations)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(item => [
        item.id,
        item.name,
        item.team,
        item.gender,
        item.signupMode,
        item.groupId,
        item.pairName,
        item.joinedAt
      ]));
  }

  function pairingSyncMode(registrations, storedSignature, hasExistingPairs) {
    const normalized = normalizeRegistrations(registrations);
    if (!normalized.length) return 'none';
    const signature = rosterSignature(normalized);
    if (String(storedSignature || '') === signature) return 'none';
    if (!storedSignature && hasExistingPairs) return 'adopt';
    return 'generate';
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
            ownerKey: '',
            signupMode: 'single',
            groupId: '',
            pairName: ''
          });
        });
      });
    });
    return registrations;
  }

  return {
    buildPairs,
    choosePairTeam,
    chooseTeam,
    cleanName,
    deriveRegistrations,
    hasName,
    fixedPartnerGroups,
    linkedRegistrations,
    lockedPlayerNames,
    nameKey,
    normalizeRegistrations,
    pairingSyncMode,
    registrationGroups,
    rosterSignature,
    slotCount,
    teamPlayers
  };
}));
