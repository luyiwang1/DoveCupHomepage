(function (root) {
  function normalize(value) {
    const tail = String(value ?? '').trim();
    return /^\d{4}$/.test(tail) ? tail : null;
  }
  root.DovePhoneTail = { normalize };
})(typeof window !== 'undefined' ? window : globalThis);
