(function (root) {
  const KEY = 'dove_finance_local_v1';
  function read() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return root.DoveFinance.validate(data);
  }
  async function add(input) {
    const save = () => {
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
      plan: person.paymentPlan || 'single', ts: person.paymentVerifiedAt, note: 'EMT · 已核实' });
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
  root.DoveFinanceStore = { read, add, recordPayment, restore, key: KEY };
})(window);
