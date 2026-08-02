const DB_BASE = 'https://dovecupdatabase-default-rtdb.firebaseio.com/doveCupWaitlistSystem';

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${DB_BASE}/${path}.json`,
      method,
      data,
      header: { 'content-type': 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error(`Firebase HTTP ${res.statusCode}`));
      },
      fail: reject
    });
  });
}

function defaultMain() {
  return {
    idSeq: 1,
    state: { title: 'Dove Cup', capacity: null, joined: [], waitlist: [] },
    updatedAt: Date.now()
  };
}

function normalizeMain(data) {
  const main = data || defaultMain();
  main.state = main.state || {};
  main.state.title = main.state.title || 'Dove Cup';
  main.state.joined = Array.isArray(main.state.joined) ? main.state.joined : [];
  main.state.waitlist = Array.isArray(main.state.waitlist) ? main.state.waitlist : [];
  main.idSeq = Number(main.idSeq) || 1;
  return main;
}

function normalizeScores(data) {
  const scores = data || {};
  scores.players = scores.players && typeof scores.players === 'object' ? scores.players : {};
  scores.events = Array.isArray(scores.events) ? scores.events : [];
  scores.attendanceWeeks = scores.attendanceWeeks && typeof scores.attendanceWeeks === 'object' ? scores.attendanceWeeks : {};
  Object.values(scores.players).forEach(player => {
    if (!player) return;
    delete player.manualWins;
    delete player.courtWins;
    delete player.wins;
    delete player.points;
  });
  scores.mode = 'attendance-only';
  return scores;
}

module.exports = {
  getMain: () => request('GET', 'main').then(normalizeMain),
  saveMain: (main) => request('PUT', 'main', Object.assign({}, normalizeMain(main), { updatedAt: Date.now() })),
  getSignupStats: () => request('GET', 'signupStats').then(data => data && typeof data === 'object' ? data : {}),
  getSignupHistory: () => request('GET', 'signupHistory').then(data => data && typeof data === 'object' ? data : {}),
  getCourts: () => request('GET', 'courtsPage'),
  saveCourts: (data) => request('PUT', 'courtsPage', Object.assign({}, data, { updatedAt: Date.now() })),
  getScores: () => request('GET', 'scores').then(normalizeScores),
  saveScores: (data) => request('PUT', 'scores', Object.assign({}, normalizeScores(data), { updatedAt: Date.now() }))
};
