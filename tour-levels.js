(function (root) {
  const groups = [
    { key: 'u20', label: '新手场 · 2.5-' },
    { key: '25_30', label: '2.5-3.0' },
    { key: '30_plus', label: '3.0-3.5' },
    { key: '35_plus', label: '3.5+' }
  ];
  const legacy = { '20_25': 'u20', under3: 'u20', over3: '30_plus' };
  function normalize(key) {
    const resolved = legacy[key] || key;
    return groups.some(group => group.key === resolved) ? resolved : 'u20';
  }
  function label(key) { return groups.find(group => group.key === normalize(key)).label; }
  root.DoveTourLevels = { groups, legacy, normalize, label };
})(typeof window !== 'undefined' ? window : globalThis);
