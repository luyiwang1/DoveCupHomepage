(function (root) {
  const identity = root.DovePlayerIdentity;
  const personKey = name => identity.key(name);
  function active(entries, entry) { return !entries.some(row => row.reverses === entry.id); }
  function summary(entries, name) {
    const own = entries.filter(row => personKey(row.name) === personKey(name));
    const account = entries.filter(row => personKey(['usage','reversal'].includes(row.type) ? row.packageOwner || row.name : row.name) === personKey(name));
    const rows = entries.filter(row => own.includes(row) || account.includes(row));
    return {
      name: identity.canonicalName(name),
      received: own.reduce((sum, row) => sum + row.amountCents, 0) / 100,
      purchased: own.filter(row => row.type === 'payment' || row.type === 'refund').reduce((sum, row) => sum + row.visits, 0),
      used: -account.filter(row => row.type === 'usage' || row.type === 'reversal').reduce((sum, row) => sum + row.visits, 0),
      remaining: account.reduce((sum, row) => sum + row.visits, 0),
      attended: own.filter(row => ['usage', 'attendance'].includes(row.type) && active(entries, row)).length,
      rows
    };
  }
  function members(entries) {
    return [...new Set(entries.map(row => personKey(row.name)))].map(key => summary(entries, entries.find(row => personKey(row.name) === key).name)).sort((a,b) => a.name.localeCompare(b.name));
  }
  function append(entries, input) {
    if (!input.id || !input.name?.trim()) throw new Error('姓名和记录编号不能为空');
    if (entries.some(row => row.id === input.id || (input.reference && row.reference === input.reference))) return entries;
    const row = { ...input, name: identity.canonicalName(input.name), ts: Number(input.ts) || Date.now(), amountCents: 0, visits: 0 };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date || '') || !Number.isFinite(Date.parse(`${row.date}T12:00:00Z`)) || new Date(`${row.date}T12:00:00Z`).toISOString().slice(0, 10) !== row.date) throw new Error('请选择活动日期');
    if (!['mrtc', 'nyta-east'].includes(row.venueKey)) throw new Error('请选择场地');
    if (row.type === 'payment') {
      delete row.packageOwner;
      if (!['single', 'package10'].includes(row.plan)) throw new Error('请选择付款项目');
      const cents = Math.round(Number(input.amount) * 100);
      if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000) throw new Error('请输入实际收款金额');
      row.amountCents = cents;
      row.visits = row.plan === 'package10' ? 10 : 0;
    } else if (row.type === 'usage' || row.type === 'attendance') {
      if (row.type === 'usage') row.packageOwner = identity.canonicalName(input.packageOwner || row.name);
      else delete row.packageOwner;
      if (row.type === 'usage' && summary(entries, row.packageOwner).remaining < 1) throw new Error('套餐余额不足');
      if (entries.some(old => ['usage', 'attendance'].includes(old.type) && personKey(old.name) === personKey(row.name) && old.date === row.date && old.venueKey === row.venueKey && active(entries, old))) throw new Error('本场次已经记录到场');
      row.visits = row.type === 'usage' ? -1 : 0;
    } else if (row.type === 'reversal' || row.type === 'refund') {
      const original = entries.find(old => old.id === row.reverses);
      if (!original || !active(entries, original) || personKey(original.name) !== personKey(row.name)) throw new Error('原记录不存在或已撤销');
      if (row.type === 'reversal' && !['usage', 'attendance'].includes(original.type)) throw new Error('只能撤销到场记录');
      if (row.type === 'refund' && original.type !== 'payment') throw new Error('只能退款收款记录');
      if (original.visits > summary(entries, row.name).remaining) throw new Error('套餐已使用，请先核对扣次记录');
      row.amountCents = original.amountCents ? -original.amountCents : 0;
      row.visits = -original.visits;
      row.venueKey = original.venueKey;
      if (original.type === 'usage') row.packageOwner = original.packageOwner || original.name;
      else delete row.packageOwner;
    } else throw new Error('记录类型无效');
    delete row.amount;
    return [...entries, row];
  }
  function validate(entries) {
    if (!Array.isArray(entries) || entries.length > 100000) throw new Error('账本格式无效');
    let rebuilt = [];
    for (const row of entries) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.name !== 'string') throw new Error('账本格式无效');
      const next = append(rebuilt, { ...row, amount: Number(row.amountCents) / 100 });
      if (next.length !== rebuilt.length + 1 || next.at(-1).amountCents !== row.amountCents || next.at(-1).visits !== row.visits) throw new Error('账本包含重复或无效记录');
      rebuilt = next;
    }
    return rebuilt;
  }
  function zeroFinance(entries) {
    return validate(entries).filter(row => ['usage', 'attendance'].includes(row.type) && active(entries, row))
      .map(row => ({ id: row.id, name: row.name, date: row.date, venueKey: row.venueKey, ts: row.ts,
        type: 'attendance', amountCents: 0, visits: 0, note: row.note || '' }));
  }
  root.DoveFinance = { summary, members, append, active, validate, zeroFinance };
})(typeof window !== 'undefined' ? window : globalThis);
