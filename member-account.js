(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoveMemberAccount = api;
}(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const PROFILE_ROOT = 'doveCupWaitlistSystem/members';
  const DRAFT_STORAGE = 'dove_member_profile_draft';
  const LEVELS = new Set(['u20', '20_25', '25_30', '30_plus']);
  let auth = null;
  let database = null;
  let profileRef = null;
  let listener = null;
  let snapshot = { ready: false, user: null, profile: null, error: '' };

  function cleanName(value) {
    return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 40);
  }

  function cleanLevel(value) {
    return LEVELS.has(value) ? value : '20_25';
  }

  function normalizeProfile(value, uid) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      uid: String(uid || input.uid || ''),
      displayName: cleanName(input.displayName),
      defaultLevel: cleanLevel(input.defaultLevel),
      createdAt: Number(input.createdAt) || 0,
      updatedAt: Number(input.updatedAt) || 0,
      verifiedAt: Number(input.verifiedAt) || 0
    };
  }

  function emit(patch) {
    snapshot = { ...snapshot, ...(patch || {}) };
    if (typeof listener === 'function') listener({ ...snapshot });
  }

  function readDraft() {
    if (typeof localStorage === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(DRAFT_STORAGE) || '{}'); } catch (error) { return {}; }
  }

  function writeDraft(value) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DRAFT_STORAGE, JSON.stringify(value || {}));
  }

  function clearDraft() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(DRAFT_STORAGE);
  }

  async function ensureVerifiedProfile(user) {
    if (!user || !user.emailVerified || !database) return null;
    const ref = database.ref(`${PROFILE_ROOT}/${user.uid}`);
    const current = (await ref.once('value')).val();
    if (current && current.displayName) return normalizeProfile(current, user.uid);
    const draft = readDraft();
    const displayName = cleanName(user.displayName || draft.displayName);
    if (!displayName) return null;
    const now = Date.now();
    const profile = normalizeProfile({
      uid: user.uid,
      displayName,
      defaultLevel: draft.defaultLevel,
      createdAt: now,
      updatedAt: now,
      verifiedAt: now
    }, user.uid);
    await ref.set(profile);
    clearDraft();
    return profile;
  }

  function stopProfileSync() {
    if (profileRef) profileRef.off();
    profileRef = null;
  }

  async function startProfileSync(user) {
    stopProfileSync();
    if (!user || !user.emailVerified || !database) {
      emit({ ready: true, profile: null });
      return;
    }
    try {
      await ensureVerifiedProfile(user);
      profileRef = database.ref(`${PROFILE_ROOT}/${user.uid}`);
      profileRef.on('value', profileSnapshot => {
        const value = profileSnapshot.val();
        emit({ ready: true, profile: value ? normalizeProfile(value, user.uid) : null, error: '' });
      }, error => emit({ ready: true, profile: null, error: error.code || error.message }));
    } catch (error) {
      emit({ ready: true, profile: null, error: error.code || error.message });
    }
  }

  function init(config, onChange) {
    listener = onChange;
    if (!root.firebase || !root.firebase.auth || !root.firebase.database) {
      emit({ ready: true, error: 'auth/sdk-unavailable' });
      return;
    }
    if (!root.firebase.apps.length) root.firebase.initializeApp(config);
    auth = root.firebase.auth();
    database = root.firebase.database();
    auth.useDeviceLanguage();
    auth.onAuthStateChanged(async user => {
      emit({ ready: false, user: user || null, profile: null, error: '' });
      await startProfileSync(user || null);
    }, error => emit({ ready: true, user: null, profile: null, error: error.code || error.message }));
  }

  async function register({ email, password, displayName, defaultLevel }) {
    if (!auth) throw new Error('auth/not-ready');
    const name = cleanName(displayName);
    if (!name) throw new Error('profile/name-required');
    writeDraft({ displayName: name, defaultLevel: cleanLevel(defaultLevel) });
    const credential = await auth.createUserWithEmailAndPassword(String(email || '').trim(), String(password || ''));
    await credential.user.updateProfile({ displayName: name });
    await credential.user.sendEmailVerification({ url: `${location.origin}${location.pathname}?verify=1` });
    emit({ user: credential.user });
    return credential.user;
  }

  async function login(email, password) {
    if (!auth) throw new Error('auth/not-ready');
    return auth.signInWithEmailAndPassword(String(email || '').trim(), String(password || ''));
  }

  async function logout() {
    if (!auth) return;
    stopProfileSync();
    await auth.signOut();
  }

  async function sendPasswordReset(email) {
    if (!auth) throw new Error('auth/not-ready');
    return auth.sendPasswordResetEmail(String(email || '').trim());
  }

  async function resendVerification() {
    if (!auth || !auth.currentUser) throw new Error('auth/not-ready');
    return auth.currentUser.sendEmailVerification({ url: `${location.origin}${location.pathname}?verify=1` });
  }

  async function refreshVerification() {
    if (!auth || !auth.currentUser) throw new Error('auth/not-ready');
    await auth.currentUser.reload();
    const user = auth.currentUser;
    emit({ user, ready: false });
    await startProfileSync(user);
    return user.emailVerified;
  }

  async function saveProfile({ displayName, defaultLevel }) {
    if (!auth || !auth.currentUser || !auth.currentUser.emailVerified || !database) throw new Error('auth/verified-user-required');
    const current = snapshot.profile || {};
    const name = cleanName(displayName);
    if (!name) throw new Error('profile/name-required');
    const now = Date.now();
    const profile = normalizeProfile({
      ...current,
      uid: auth.currentUser.uid,
      displayName: name,
      defaultLevel: cleanLevel(defaultLevel),
      createdAt: Number(current.createdAt) || now,
      updatedAt: now,
      verifiedAt: Number(current.verifiedAt) || now
    }, auth.currentUser.uid);
    await auth.currentUser.updateProfile({ displayName: name });
    await database.ref(`${PROFILE_ROOT}/${auth.currentUser.uid}`).set(profile);
    return profile;
  }

  function identity(accountSnapshot = snapshot) {
    const user = accountSnapshot.user;
    const profile = accountSnapshot.profile;
    if (!user || !user.emailVerified || !profile || !profile.displayName) return null;
    return {
      memberUid: user.uid,
      ownerKey: user.uid,
      name: profile.displayName,
      levelGroup: cleanLevel(profile.defaultLevel)
    };
  }

  function current() {
    return { ...snapshot };
  }

  return {
    cleanLevel,
    cleanName,
    current,
    identity,
    init,
    login,
    logout,
    normalizeProfile,
    refreshVerification,
    register,
    resendVerification,
    saveProfile,
    sendPasswordReset
  };
}));
