const db = require('../../utils/db');
const LEVEL_VERSION = '4-level-v1';

Page({
  data: {
    players: [],
    courtCount: 5,
    courtCountInput: 5,
    baseCourts: [],
    divisionRanges: [],
    rounds: [],
    roundScores: {},
    isAdmin: false
  },

  onLoad() {
    this.setData({ isAdmin: wx.getStorageSync('dove_admin') === '1' });
    this.loadData();
  },

  onShow() {
    this.loadData(false);
    this.timer = setInterval(() => this.loadData(false), 4000);
  },

  onHide() {
    clearInterval(this.timer);
    clearTimeout(this.scoreTimer);
  },

  loadData(showLoading = true) {
    if (showLoading) wx.showLoading({ title: '同步中' });
    Promise.all([db.getMain(), db.getCourts()])
      .then(([main, layout]) => {
        const joined = main.state.joined || [];
        const players = joined
          .filter(p => p && p.name)
          .map((p, i) => ({ key: String(p.id || `${p.name}-${i}`), name: p.name, levelGroup: this.normalizeLevel(p.levelGroup) }));
        const validLayout = layout && layout.levelVersion === LEVEL_VERSION ? layout : {};
        const courtCount = Number(validLayout && validLayout.courtCount) || this.data.courtCount || 5;
        const roundScores = validLayout && validLayout.roundScores && typeof validLayout.roundScores === 'object' ? validLayout.roundScores : {};
        this.setData({ players, courtCount, courtCountInput: courtCount, roundScores }, () => {
          this.applySavedLayout(validLayout);
        });
      })
      .catch(() => wx.showToast({ title: '同步失败', icon: 'none' }))
      .finally(() => showLoading && wx.hideLoading());
  },

  toggleAdmin() {
    if (this.data.isAdmin) {
      wx.removeStorageSync('dove_admin');
      this.setData({ isAdmin: false }, () => this.buildRounds());
      return;
    }
    wx.showModal({
      title: '管理员登录',
      editable: true,
      placeholderText: '请输入密码',
      success: (res) => {
        if (res.confirm && res.content === getApp().globalData.adminPassword) {
          wx.setStorageSync('dove_admin', '1');
          this.setData({ isAdmin: true }, () => this.buildRounds());
        } else if (res.confirm) wx.showToast({ title: '密码错误', icon: 'none' });
      }
    });
  },

  onCourtCountInput(e) { this.setData({ courtCountInput: e.detail.value }); },

  emptyCourts() {
    return Array.from({ length: this.data.courtCount }, () => []);
  },

  levelGroups() {
    return [
      { key: '30_plus', label: '3.0+' },
      { key: '25_30', label: '2.5-3.0' },
      { key: '20_25', label: '2.0-2.5' },
      { key: 'u20', label: '新手场 · 2.0-' }
    ];
  },

  normalizeLevel(level) {
    const legacy = { over3: '30_plus', under3: '20_25' };
    const groups = this.levelGroups();
    return groups.some(g => g.key === level) ? level : legacy[level] || '20_25';
  },

  levelOrder(level) {
    const key = this.normalizeLevel(level);
    const idx = this.levelGroups().findIndex(g => g.key === key);
    return idx === -1 ? this.levelGroups().length : idx;
  },

  levelLabel(level) {
    const key = this.normalizeLevel(level);
    return (this.levelGroups().find(g => g.key === key) || this.levelGroups()[2]).label;
  },

  applySavedLayout(layout) {
    const fallback = this.splitInitialCourts(this.data.players);
    const byKey = new Map(this.data.players.map(p => [p.key, p]));
    const used = new Set();
    const baseCourts = this.emptyCourts();
    if (Array.isArray(layout.courts)) {
      layout.courts.slice(0, this.data.courtCount).forEach((court, idx) => {
        if (!Array.isArray(court)) return;
        court.forEach(key => {
          const player = byKey.get(String(key));
          if (player && !used.has(player.key)) {
            baseCourts[idx].push(player);
            used.add(player.key);
          }
        });
      });
    }
    this.data.players.forEach(player => {
      if (used.has(player.key)) return;
      const division = this.divisionForLevel(player.levelGroup) || { start: 0, end: baseCourts.length - 1 };
      let target = division.start;
      for (let i = division.start + 1; i <= division.end; i++) if (baseCourts[i].length < baseCourts[target].length) target = i;
      baseCourts[target].push(player);
    });
    this.setData({ baseCourts: used.size ? baseCourts : fallback }, () => this.buildRounds());
  },

  shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  splitInitialCourts(list) {
    const groups = Object.values(list.reduce((acc, player) => {
      const level = this.normalizeLevel(player.levelGroup);
      player.levelGroup = level;
      acc[level] = acc[level] || { level, players: [] };
      acc[level].players.push(player);
      return acc;
    }, {})).sort((a, b) => this.levelOrder(a.level) - this.levelOrder(b.level));
    const allocations = {};
    groups.forEach(group => { allocations[group.level] = 1; });
    let left = Math.max(groups.length, this.data.courtCount) - groups.length;
    const sorted = [...groups].sort((a, b) => b.players.length - a.players.length);
    while (left > 0 && sorted.length) {
      allocations[sorted[(left - 1) % sorted.length].level] += 1;
      left -= 1;
    }
    const divisionRanges = [];
    const result = [];
    let start = 0;
    groups.forEach(group => {
      const count = allocations[group.level] || 1;
      const courts = Array.from({ length: count }, () => []);
      group.players.forEach((player, i) => courts[i % count].push(player));
      result.push(...courts);
      divisionRanges.push({ level: group.level, label: this.levelLabel(group.level), start, end: start + count - 1 });
      start += count;
    });
    this.data.courtCount = Math.max(1, result.length);
    this.data.divisionRanges = divisionRanges;
    this.setData({ courtCount: this.data.courtCount, divisionRanges });
    return result.length ? result : this.emptyCourts();
  },

  divisionForLevel(level) {
    const key = this.normalizeLevel(level);
    return this.data.divisionRanges.find(d => d.level === key);
  },

  divisionForCourt(idx) {
    return this.data.divisionRanges.find(d => idx >= d.start && idx <= d.end) || { start: 0, end: this.data.courtCount - 1, label: '全部' };
  },

  makeMatch(list, courtIndex, roundIndex) {
    const teamA = [];
    const teamB = [];
    list.filter(Boolean).forEach((p, i) => {
      if (list.length >= 4) (i === 0 || i === 3 ? teamA : teamB).push(p);
      else (i % 2 === 0 ? teamA : teamB).push(p);
    });
    const score = this.data.roundScores[`${roundIndex}-${courtIndex}`] || {};
    const scored = score.a !== '' && score.b !== '' && Number.isFinite(Number(score.a)) && Number.isFinite(Number(score.b));
    const aWin = scored && Number(score.a) >= Number(score.b);
    const bWin = scored && Number(score.b) > Number(score.a);
    return {
      courtIndex,
      courtName: `${this.divisionForCourt(courtIndex).label} · Court ${courtIndex + 1}`,
      teamA,
      teamB,
      captainKey: this.pickCaptain(teamA, teamB, roundIndex, courtIndex),
      scoreA: score.a === undefined ? '' : score.a,
      scoreB: score.b === undefined ? '' : score.b,
      aWin,
      bWin,
      moveText: `胜→Court ${this.winnerCourt(courtIndex)} / 负→Court ${this.loserCourt(courtIndex)}`
    };
  },

  pickCaptain(teamA, teamB, roundIndex, courtIndex) {
    const all = teamA.concat(teamB);
    return all.length ? all[(roundIndex + courtIndex) % all.length].key : null;
  },

  addSplitPair(bucket, team) {
    team.forEach((p, i) => bucket[i % 2 === 0 ? 'a' : 'b'].push(p));
  },

  winnerCourt(idx) {
    const division = this.divisionForCourt(idx);
    return Math.max(division.start + 1, idx);
  },

  loserCourt(idx) {
    const division = this.divisionForCourt(idx);
    return Math.min(division.end + 1, idx + 2);
  },

  buildRounds() {
    const rounds = [];
    let current = this.data.baseCourts.map((court, idx) => this.makeMatch(court, idx, 0));
    for (let r = 0; r < 3; r++) {
      rounds.push({ title: `第 ${r + 1} 轮`, matches: current });
      if (r === 2) break;
      const buckets = Array.from({ length: this.data.courtCount }, () => ({ a: [], b: [] }));
      current.forEach((match, idx) => {
        let win = match.teamA;
        let lose = match.teamB;
        if (match.bWin) {
          win = match.teamB;
          lose = match.teamA;
        }
        const division = this.divisionForCourt(idx);
        this.addSplitPair(buckets[Math.max(division.start, idx - 1)], win);
        this.addSplitPair(buckets[Math.min(division.end, idx + 1)], lose);
      });
      current = buckets.map((bucket, idx) => this.makeMatch(bucket.a.concat(bucket.b), idx, r + 1));
      current = buckets.map((bucket, idx) => {
        const match = this.makeMatch([], idx, r + 1);
        match.teamA = bucket.a;
        match.teamB = bucket.b;
        match.captainKey = this.pickCaptain(match.teamA, match.teamB, r + 1, idx);
        return match;
      });
    }
    this.setData({ rounds });
  },

  reshuffle() {
    if (!this.data.isAdmin) return;
    const baseCourts = this.splitInitialCourts(this.shuffle(this.data.players));
    this.setData({ baseCourts, roundScores: {} }, () => {
      this.buildRounds();
      this.saveLayout();
      this.scheduleScoreSync();
    });
  },

  saveCourtCount() {
    if (!this.data.isAdmin) return;
    const val = parseInt(this.data.courtCountInput, 10);
    if (!Number.isFinite(val) || val < 1 || val > 20) return wx.showToast({ title: '请输入 1-20', icon: 'none' });
    this.setData({ courtCount: val, courtCountInput: val }, () => this.reshuffle());
  },

  clearScores() {
    if (!this.data.isAdmin) return;
    wx.showModal({
      title: '清空比分',
      content: '确定清空三轮比分吗？积分榜里的场地比分也会归零。',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ roundScores: {} }, () => {
          this.buildRounds();
          this.saveLayout();
          this.scheduleScoreSync();
        });
      }
    });
  },

  onScoreInput(e) {
    if (!this.data.isAdmin) return;
    const { round, court, side } = e.currentTarget.dataset;
    const key = `${round}-${court}`;
    const roundScores = JSON.parse(JSON.stringify(this.data.roundScores));
    roundScores[key] = roundScores[key] || {};
    roundScores[key][side] = e.detail.value === '' ? '' : Number(e.detail.value);
    this.setData({ roundScores }, () => {
      this.buildRounds();
      this.saveLayout();
      this.scheduleScoreSync();
    });
  },

  saveLayout() {
    const data = {
      levelVersion: LEVEL_VERSION,
      courtCount: this.data.courtCount,
      courts: this.data.baseCourts.map(court => court.map(p => p.key)),
      roundScores: this.data.roundScores
    };
    db.saveCourts(data).catch(() => wx.showToast({ title: '保存失败', icon: 'none' }));
  },

  scheduleScoreSync() {
    clearTimeout(this.scoreTimer);
    this.scoreTimer = setTimeout(() => this.syncScores(true), 600);
  },

  computeCourtWins() {
    const totals = {};
    this.data.rounds.forEach((round, rIdx) => {
      round.matches.forEach((match, cIdx) => {
        const score = this.data.roundScores[`${rIdx}-${cIdx}`] || {};
        if (!Number.isFinite(Number(score.a)) || !Number.isFinite(Number(score.b))) return;
        match.teamA.forEach(p => { totals[p.key] = (totals[p.key] || 0) + Number(score.a); });
        match.teamB.forEach(p => { totals[p.key] = (totals[p.key] || 0) + Number(score.b); });
      });
    });
    return totals;
  },

  keyForName(name) {
    return name.trim().toLowerCase().replace(/[.#$/[\]]/g, '_');
  },

  syncScores(silent = false) {
    if (!this.data.isAdmin && !silent) return;
    Promise.resolve(db.getScores()).then(scores => {
      const wins = this.computeCourtWins();
      this.data.players.forEach(p => {
        const key = this.keyForName(p.name);
        const existing = scores.players[key] || { key, name: p.name, appearances: 0, wins: 0, points: 0 };
        const manualWins = Number(existing.manualWins !== undefined ? existing.manualWins : (Number(existing.wins || 0) - Number(existing.courtWins || 0))) || 0;
        existing.name = p.name;
        existing.manualWins = manualWins;
        existing.courtWins = Number(wins[p.key] || 0);
        existing.wins = existing.manualWins + existing.courtWins;
        existing.points = existing.wins * 10;
        scores.players[key] = existing;
      });
      scores.events.unshift({ type: 'courtScores', ts: Date.now() });
      scores.events = scores.events.slice(0, 20);
      return db.saveScores(scores);
    }).then(() => {
      if (!silent) wx.showToast({ title: '已同步积分' });
    }).catch(() => wx.showToast({ title: '同步失败', icon: 'none' }));
  }
});
