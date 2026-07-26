const db = require('../../utils/db');

Page({
  data: {
    state: { title: 'Dove Cup', capacity: null, joined: [], waitlist: [] },
    idSeq: 1,
    nameInput: '',
    levelGroups: [
      { key: 'u20', label: '2.0-' },
      { key: '20_25', label: '2.0-2.5' },
      { key: '25_30', label: '2.5-3.0' },
      { key: '30_plus', label: '3.0+' }
    ],
    levelIndex: 1,
    levelCapacity: 4,
    capacityInput: '',
    isAdmin: false,
    userKey: ''
  },

  onLoad() {
    let userKey = wx.getStorageSync('dove_user_key');
    if (!userKey) {
      userKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      wx.setStorageSync('dove_user_key', userKey);
    }
    this.setData({ userKey, isAdmin: wx.getStorageSync('dove_admin') === '1' });
    this.loadData();
  },

  onShow() {
    this.loadData();
    this.timer = setInterval(() => this.loadData(false), 3000);
  },

  onHide() {
    clearInterval(this.timer);
  },

  loadData(showLoading = true) {
    if (showLoading) wx.showLoading({ title: '同步中' });
    db.getMain()
      .then(main => {
        this.setData({
          state: this.decorateState(main.state),
          idSeq: main.idSeq,
          capacityInput: main.state.capacity || ''
        });
      })
      .catch(() => wx.showToast({ title: '同步失败', icon: 'none' }))
      .finally(() => showLoading && wx.hideLoading());
  },

  saveState(nextState, nextIdSeq) {
    const cleanState = JSON.parse(JSON.stringify(nextState));
    cleanState.joined = (cleanState.joined || []).map(p => {
      const next = Object.assign({}, p);
      delete next.levelLabel;
      return next;
    });
    cleanState.waitlist = (cleanState.waitlist || []).map(p => {
      const next = Object.assign({}, p);
      delete next.levelLabel;
      return next;
    });
    const payload = { state: cleanState, idSeq: nextIdSeq || this.data.idSeq };
    this.setData({ state: this.decorateState(cleanState), idSeq: payload.idSeq });
    return db.saveMain(payload).catch(() => wx.showToast({ title: '保存失败', icon: 'none' }));
  },

  toggleAdmin() {
    if (this.data.isAdmin) {
      wx.removeStorageSync('dove_admin');
      this.setData({ isAdmin: false });
      return;
    }
    wx.showModal({
      title: '管理员登录',
      editable: true,
      placeholderText: '请输入密码',
      success: (res) => {
        if (res.confirm && res.content === getApp().globalData.adminPassword) {
          wx.setStorageSync('dove_admin', '1');
          this.setData({ isAdmin: true });
        } else if (res.confirm) wx.showToast({ title: '密码错误', icon: 'none' });
      }
    });
  },

  normalizeLevel(level) {
    const legacy = { under3: '20_25', over3: '30_plus' };
    const key = this.data.levelGroups.some(g => g.key === level) ? level : legacy[level] || '20_25';
    return key;
  },

  levelLabel(level) {
    const key = this.normalizeLevel(level);
    return (this.data.levelGroups.find(g => g.key === key) || this.data.levelGroups[1]).label;
  },

  decorateState(state) {
    const next = JSON.parse(JSON.stringify(state || { title: 'Dove Cup', capacity: null, joined: [], waitlist: [] }));
    next.joined = Array.isArray(next.joined) ? next.joined.map(p => Object.assign({}, p, {
      levelGroup: this.normalizeLevel(p.levelGroup),
      levelLabel: this.levelLabel(p.levelGroup)
    })) : [];
    next.waitlist = Array.isArray(next.waitlist) ? next.waitlist.map(p => Object.assign({}, p, {
      levelGroup: this.normalizeLevel(p.levelGroup),
      levelLabel: this.levelLabel(p.levelGroup)
    })) : [];
    const counts = {};
    const overflow = [];
    next.joined = next.joined.filter(p => {
      const key = this.normalizeLevel(p.levelGroup);
      counts[key] = counts[key] || 0;
      if (counts[key] >= this.data.levelCapacity) {
        overflow.push(Object.assign({}, p, { levelGroup: key, ts: p.ts || Date.now() }));
        return false;
      }
      counts[key] += 1;
      return true;
    });
    next.waitlist = overflow.concat(next.waitlist);
    return next;
  },

  joinedCountForLevel(state, levelGroup) {
    const key = this.normalizeLevel(levelGroup);
    return (state.joined || []).filter(p => this.normalizeLevel(p.levelGroup) === key).length;
  },

  canJoinLevel(state, levelGroup) {
    const key = this.normalizeLevel(levelGroup);
    const levelOpen = this.joinedCountForLevel(state, key) < this.data.levelCapacity;
    const globalOpen = !state.capacity || state.joined.length < state.capacity;
    return levelOpen && globalOpen;
  },

  waitlistIndexForOpenLevel(state, preferredLevel) {
    if (preferredLevel && this.canJoinLevel(state, preferredLevel)) {
      const preferredIdx = state.waitlist.findIndex(p => this.normalizeLevel(p.levelGroup) === this.normalizeLevel(preferredLevel));
      if (preferredIdx !== -1) return preferredIdx;
    }
    return state.waitlist.findIndex(p => this.canJoinLevel(state, p.levelGroup));
  },

  onNameInput(e) { this.setData({ nameInput: e.detail.value }); },
  onLevelChange(e) { this.setData({ levelIndex: Number(e.detail.value) || 0 }); },
  onCapacityInput(e) { this.setData({ capacityInput: e.detail.value }); },

  addJoined() { this.addPerson('joined'); },
  addWaitlist() { this.addPerson('waitlist'); },

  addPerson(list) {
    const name = this.data.nameInput.trim();
    if (!name) return wx.showToast({ title: '请输入姓名', icon: 'none' });
    const state = JSON.parse(JSON.stringify(this.data.state));
    let idSeq = this.data.idSeq + 1;
    const levelGroup = this.data.levelGroups[this.data.levelIndex].key;
    if (list === 'joined' && !this.canJoinLevel(state, levelGroup)) {
      list = 'waitlist';
      wx.showToast({ title: `${this.levelLabel(levelGroup)} 已满，已进 Waitlist`, icon: 'none' });
    }
    const person = { id: idSeq, name, levelGroup, ownerKey: this.data.userKey, confirmed: false, paid: false, ts: Date.now() };
    if (list === 'joined') state.joined.push(person);
    else state.waitlist.push({ id: person.id, name, levelGroup, ownerKey: person.ownerKey, ts: person.ts });
    this.setData({ nameInput: '' });
    this.saveState(state, idSeq);
  },

  saveCapacity() {
    if (!this.data.isAdmin) return;
    const capacity = parseInt(this.data.capacityInput, 10);
    if (!Number.isFinite(capacity) || capacity < 1) return wx.showToast({ title: '请输入有效名额', icon: 'none' });
    const state = JSON.parse(JSON.stringify(this.data.state));
    state.capacity = capacity;
    if (state.joined.length > capacity) {
      const overflow = state.joined.splice(capacity);
      state.waitlist = overflow.map(p => ({ id: p.id, name: p.name, levelGroup: this.normalizeLevel(p.levelGroup), ownerKey: p.ownerKey, ts: Date.now() })).concat(state.waitlist);
    }
    this.saveState(state);
  },

  findJoined(id) {
    return this.data.state.joined.findIndex(p => String(p.id) === String(id));
  },

  canEdit(person) {
    return this.data.isAdmin || person.ownerKey === this.data.userKey;
  },

  toggleConfirm(e) {
    const state = JSON.parse(JSON.stringify(this.data.state));
    const idx = state.joined.findIndex(p => String(p.id) === String(e.currentTarget.dataset.id));
    if (idx < 0 || !this.canEdit(state.joined[idx])) return;
    state.joined[idx].confirmed = !state.joined[idx].confirmed;
    this.saveState(state);
  },

  togglePaid(e) {
    const state = JSON.parse(JSON.stringify(this.data.state));
    const idx = state.joined.findIndex(p => String(p.id) === String(e.currentTarget.dataset.id));
    if (idx < 0 || !this.canEdit(state.joined[idx])) return;
    state.joined[idx].paid = !state.joined[idx].paid;
    this.saveState(state);
  },

  removeJoined(e) {
    const state = JSON.parse(JSON.stringify(this.data.state));
    const idx = state.joined.findIndex(p => String(p.id) === String(e.currentTarget.dataset.id));
    if (idx < 0 || !this.canEdit(state.joined[idx])) return;
    state.joined.splice(idx, 1);
    if (state.waitlist.length) {
      const openIdx = this.waitlistIndexForOpenLevel(state);
      if (openIdx === -1) return this.saveState(state);
      const next = state.waitlist.splice(openIdx, 1)[0];
      state.joined.push({ id: next.id, name: next.name, levelGroup: this.normalizeLevel(next.levelGroup), ownerKey: next.ownerKey, confirmed: false, paid: false, ts: Date.now() });
    }
    this.saveState(state);
  },

  removeWaitlist(e) {
    const state = JSON.parse(JSON.stringify(this.data.state));
    const idx = state.waitlist.findIndex(p => String(p.id) === String(e.currentTarget.dataset.id));
    if (idx < 0 || !this.canEdit(state.waitlist[idx])) return;
    state.waitlist.splice(idx, 1);
    this.saveState(state);
  },

  promoteOne(e) {
    if (!this.data.isAdmin) return;
    const state = JSON.parse(JSON.stringify(this.data.state));
    const idx = state.waitlist.findIndex(p => String(p.id) === String(e.currentTarget.dataset.id));
    if (idx < 0) return;
    const next = state.waitlist[idx];
    if (!this.canJoinLevel(state, next.levelGroup)) return wx.showToast({ title: `${this.levelLabel(next.levelGroup)} 已满`, icon: 'none' });
    state.waitlist.splice(idx, 1);
    state.joined.push({ id: next.id, name: next.name, levelGroup: this.normalizeLevel(next.levelGroup), ownerKey: next.ownerKey, confirmed: false, paid: false, ts: Date.now() });
    this.saveState(state);
  }
});
