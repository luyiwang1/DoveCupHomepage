(function initPlayerIdentity(root) {
  'use strict';
  const groups = [
    { name: 'Mr . DANIEL', aliases: ['Daniel', 'Mr DANIEL', 'Mr. DANIEL', 'Mr.DANIEL'] },
    { name: 'Alvin Lyu', aliases: ['Alvin'] },
    { name: 'Erika Zhang', aliases: ['Erika'] },
    { name: 'Han M', aliases: ['Han'] },
    { name: '葉 ღ', aliases: ['xin yi'] }
  ];
  function normalize(name) {
    return String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-CA');
  }
  const aliases = new Map();
  groups.forEach(group => [group.name, ...group.aliases].forEach(name => aliases.set(normalize(name), group.name)));
  function canonicalName(name) {
    const clean = String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
    return aliases.get(normalize(clean)) || String(name || '').trim();
  }
  function key(name) { return normalize(canonicalName(name)); }
  function scoreKey(name) { return canonicalName(name).toLocaleLowerCase('en-CA').replace(/[.#$/[\]]/g, '_'); }
  root.DovePlayerIdentity = { groups, normalize, canonicalName, key, scoreKey };
})(typeof window !== 'undefined' ? window : globalThis);
