(function (root) {
  const key = 'signup_owned_names_v1';
  function names(storage, legacyName) {
    let saved = [];
    try { saved = JSON.parse(storage.getItem(key) || '[]'); } catch (_) {}
    return new Set([...(Array.isArray(saved) ? saved : []), legacyName].filter(Boolean).map(root.DovePlayerIdentity.key));
  }
  function remember(storage, name, legacyName) {
    const saved = names(storage, legacyName);
    saved.add(root.DovePlayerIdentity.key(name));
    storage.setItem(key, JSON.stringify([...saved]));
  }
  function owns(person, browserKey, storage, legacyName) {
    return Boolean(person && typeof browserKey === 'string' && browserKey
      && typeof person.ownerKey === 'string' && person.ownerKey === browserKey);
  }
  root.DoveSignupOwnership = { owns, remember };
})(typeof window !== 'undefined' ? window : globalThis);
