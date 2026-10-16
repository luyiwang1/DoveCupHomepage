(function (root) {
  const KEY = 'dove_finance_local_v1';
  const START_KEY = 'dove_finance_start_at';
  const BACKUP_KEY = 'dove_finance_reset_backup';
  function read() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return root.DoveFinance.validate(data);
  }
  async function add(input) {
    const save = () => {
      if (input.origin === 'verified-receipt' && Number(input.ts) <= Number(localStorage.getItem(START_KEY) || 0)) return read();
      const entries = root.DoveFinance.append(read(), input);
      localStorage.setItem(KEY, JSON.stringify(entries));
      root.dispatchEvent(new Event('dove:financechange'));
      return entries;
    };
    return navigator.locks ? navigator.locks.request(KEY, save) : save();
  }
  async function recordPayment(person, context) {
    if (!Number(person.paymentAmount) || !person.paymentVerifiedAt) return;
    const reference = `${context.venueKey}:${person.id}:${person.paymentSubmittedAt || person.ts || person.registeredAt || context.date}`;
    return add({ id: `receipt-${reference}`, reference, type: 'payment', name: person.name,
      date: context.date, venueKey: context.venueKey, amount: Number(person.paymentAmount),
      plan: person.paymentPlan || 'single', ts: person.paymentVerifiedAt, origin: 'verified-receipt', note: 'EMT · 已核实' });
  }
  async function restore(entries) {
    const validated = root.DoveFinance.validate(entries);
    const save = () => {
      localStorage.setItem(KEY, JSON.stringify(validated));
      root.dispatchEvent(new Event('dove:financechange'));
      return validated;
    };
    return navigator.locks ? navigator.locks.request(KEY, save) : save();
  }
  async function resetFinance() {
    const save = () => {
      const entries = read();
      const now = Date.now();
      const next = root.DoveFinance.zeroFinance(entries);
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ format: 'dove-finance-v1', exportedAt: new Date(now).toISOString(), entries }));
      const oldStart = localStorage.getItem(START_KEY);
      try {
        localStorage.setItem(START_KEY, String(now));
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (error) {
        if (oldStart === null) localStorage.removeItem(START_KEY); else localStorage.setItem(START_KEY, oldStart);
        throw error;
      }
      root.dispatchEvent(new Event('dove:financechange'));
      return next;
    };
    return navigator.locks ? navigator.locks.request(KEY, save) : save();
  }
  function resetBackup() { const raw = localStorage.getItem(BACKUP_KEY); return raw ? JSON.parse(raw) : null; }
  root.DoveFinanceStore = { read, add, recordPayment, restore, resetFinance, resetBackup, key: KEY };
})(window);
