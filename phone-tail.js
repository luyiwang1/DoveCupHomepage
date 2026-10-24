(function (root) {
  function normalize(value) {
    const tail = String(value ?? '').trim();
    return /^\d{4}$/.test(tail) ? tail : null;
  }
  function updatePerson(person, value, allowed) {
    if (!person || !allowed) throw new Error('你只能修改自己的状态');
    const tail = normalize(value);
    if (!tail) throw new Error('请输入手机尾号4位数字');
    return { ...person, phoneLast4: tail };
  }
  root.DovePhoneTail = { normalize, updatePerson };
})(typeof window !== 'undefined' ? window : globalThis);
