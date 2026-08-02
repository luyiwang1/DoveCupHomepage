(function exposeCalculator(root, factory) {
  const calculator = factory();
  if (typeof module === 'object' && module.exports) module.exports = calculator;
  root.DoveTeamCalculator = calculator;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createCalculator() {
  function cleanGame(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function matchWinner(match) {
    const phoenix = cleanGame(match.phoenixGames);
    const griffin = cleanGame(match.griffinGames);
    if (phoenix === null || griffin === null) return null;
    if (phoenix > griffin) return 'phoenix';
    if (griffin > phoenix) return 'griffin';
    return match.winnerOverride === 'phoenix' || match.winnerOverride === 'griffin'
      ? match.winnerOverride
      : null;
  }

  function calculate(rounds) {
    const totals = {
      phoenix: { teamPoints: 0, games: 0 },
      griffin: { teamPoints: 0, games: 0 },
      completed: 0,
      pending: 0,
      total: 0,
      winner: null,
      decidedBy: null
    };

    (Array.isArray(rounds) ? rounds : []).forEach(round => {
      (Array.isArray(round.matches) ? round.matches : []).forEach(match => {
        totals.total += 1;
        const phoenix = cleanGame(match.phoenixGames);
        const griffin = cleanGame(match.griffinGames);
        if (phoenix === null || griffin === null) {
          totals.pending += 1;
          return;
        }
        totals.phoenix.games += phoenix;
        totals.griffin.games += griffin;
        const winner = matchWinner(match);
        if (!winner) {
          totals.pending += 1;
          return;
        }
        totals[winner].teamPoints += 1;
        totals.completed += 1;
      });
    });

    if (totals.total === 0 || totals.pending > 0) return totals;
    if (totals.phoenix.teamPoints !== totals.griffin.teamPoints) {
      totals.winner = totals.phoenix.teamPoints > totals.griffin.teamPoints ? 'phoenix' : 'griffin';
      totals.decidedBy = 'teamPoints';
      return totals;
    }
    if (totals.phoenix.games !== totals.griffin.games) {
      totals.winner = totals.phoenix.games > totals.griffin.games ? 'phoenix' : 'griffin';
      totals.decidedBy = 'games';
      return totals;
    }
    totals.decidedBy = 'tie';
    return totals;
  }

  function lineupIssues(round, pairIds) {
    const issues = [];
    ['phoenix', 'griffin'].forEach(team => {
      const selected = (round.matches || []).map(match => match[`${team}PairId`]).filter(Boolean);
      const missing = pairIds.filter(id => !selected.includes(id));
      const duplicates = selected.filter((id, index) => selected.indexOf(id) !== index);
      if (missing.length || duplicates.length) issues.push(team);
    });
    return issues;
  }

  function roundRotation(round, pairIds) {
    const ids = Array.isArray(pairIds) ? pairIds : [];
    const match = round && Array.isArray(round.matches) ? round.matches[0] : null;
    const phoenix = match ? ids.indexOf(match.phoenixPairId) : -1;
    const griffin = match ? ids.indexOf(match.griffinPairId) : -1;
    return phoenix >= 0 && griffin >= 0
      ? (griffin - phoenix + ids.length) % ids.length
      : null;
  }

  function nextRoundRotation(rounds, pairIds) {
    const ids = Array.isArray(pairIds) ? pairIds : [];
    if (!ids.length) return 0;
    const used = new Set((Array.isArray(rounds) ? rounds : [])
      .map(round => roundRotation(round, ids))
      .filter(value => value !== null));
    const available = ids.map((_, index) => index).find(index => !used.has(index));
    return available === undefined ? (Array.isArray(rounds) ? rounds.length : 0) % ids.length : available;
  }

  function removeRound(rounds, index) {
    const source = Array.isArray(rounds) ? rounds : [];
    if (source.length <= 1 || !Number.isInteger(index) || index < 0 || index >= source.length) return null;
    return source.filter((_, roundIndex) => roundIndex !== index)
      .map((round, roundIndex) => ({ ...round, name: `第 ${roundIndex + 1} 轮` }));
  }

  return { calculate, cleanGame, lineupIssues, matchWinner, nextRoundRotation, removeRound, roundRotation };
}));
