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
  let recaptchaVerifier = null;
  let confirmationResult = null;
  let listener = null;
  let snapshot = { ready: false, user: null, profile: null, error: '' };

  function cleanName(value) {
    return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 40);
  }

  function cleanLevel(value) {
    return LEVELS.has(value) ? value : '20_25';
  }

  function normalizePhone(value) {
    const raw = String(value || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    throw new Error('auth/invalid-phone-number');
  }

  function maskedPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 4 ? `••• ••• ${digits.slice(-4)}` : '';
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

  async function ensureMemberProfile(user) {
    if (!user || !user.phoneNumber || !database) return null;
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
    if (!user || !user.phoneNumber || !database) {
      emit({ ready: true, profile: null });
      return;
    }
    try {
      await ensureMemberProfile(user);
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
    const syncLanguage = () => {
      const language = root.DoveLanguage && root.DoveLanguage.getLanguage ? root.DoveLanguage.getLanguage() : '';
      auth.languageCode = language === 'en' ? 'en' : 'zh-CN';
    };
    syncLanguage();
    if (root.addEventListener) root.addEventListener('dove:languagechange', syncLanguage);
    auth.onAuthStateChanged(async user => {
      emit({ ready: false, user: user || null, profile: null, error: '' });
      await startProfileSync(user || null);
    }, error => emit({ ready: true, user: null, profile: null, error: error.code || error.message }));
  }

  function clearPhoneChallenge() {
    if (recaptchaVerifier) recaptchaVerifier.clear();
    recaptchaVerifier = null;
    confirmationResult = null;
  }

  async function sendCode({ phone, displayName, defaultLevel, recaptchaContainerId }) {
    if (!auth) throw new Error('auth/not-ready');
    const name = cleanName(displayName);
    if (!name) throw new Error('profile/name-required');
    const normalizedPhone = normalizePhone(phone);
    writeDraft({ displayName: name, defaultLevel: cleanLevel(defaultLevel) });
    if (recaptchaVerifier) recaptchaVerifier.clear();
    recaptchaVerifier = new root.firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
      size: 'normal',
      'expired-callback': () => emit({ error: 'auth/recaptcha-expired' })
    });
    try {
      confirmationResult = await auth.signInWithPhoneNumber(normalizedPhone, recaptchaVerifier);
      return { phone: normalizedPhone, maskedPhone: maskedPhone(normalizedPhone) };
    } catch (error) {
      if (recaptchaVerifier) recaptchaVerifier.clear();
      recaptchaVerifier = null;
      confirmationResult = null;
      throw error;
    }
  }

  async function confirmCode(code) {
    if (!confirmationResult) throw new Error('auth/code-not-sent');
    const cleanCode = String(code || '').replace(/\D/g, '');
    if (cleanCode.length !== 6) throw new Error('auth/invalid-verification-code');
    const credential = await confirmationResult.confirm(cleanCode);
    const draft = readDraft();
    if (draft.displayName) await credential.user.updateProfile({ displayName: cleanName(draft.displayName) });
    if (recaptchaVerifier) recaptchaVerifier.clear();
    recaptchaVerifier = null;
    confirmationResult = null;
    await ensureMemberProfile(credential.user);
    return credential.user;
  }

  async function logout() {
    if (!auth) return;
    stopProfileSync();
    clearPhoneChallenge();
    await auth.signOut();
  }

  async function saveProfile({ displayName, defaultLevel }) {
    if (!auth || !auth.currentUser || !auth.currentUser.phoneNumber || !database) throw new Error('auth/verified-user-required');
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
    if (!user || !user.phoneNumber || !profile || !profile.displayName) return null;
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
    confirmCode,
    current,
    identity,
    init,
    logout,
    maskedPhone,
    normalizeProfile,
    normalizePhone,
    saveProfile,
    sendCode
  };
}));
