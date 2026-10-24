(function (root) {
  const email = 'GoldenDoveTour@outlook.com';
  const plans = { single: { amount: 40 }, package10: { amount: 350 } };
  function status(person) {
    return ['unpaid', 'pending', 'received', 'package_pending'].includes(person.paymentStatus)
      ? person.paymentStatus : person.paid ? 'received' : 'unpaid';
  }
  function label(person) {
    return { unpaid: '未付款', pending: '待核实', received: '已收款', package_pending: '套餐待核实' }[status(person)];
  }
  function submit(person, plan, allowed, now = Date.now()) {
    if (!allowed || status(person) !== 'unpaid') return person;
    if (plan === 'use_package') return { ...person, paid: false, paymentStatus: 'package_pending',
      paymentPlan: plan, paymentAmount: 0, paymentSubmittedAt: now };
    const paymentPlan = Object.hasOwn(plans, plan) ? plan : 'single';
    return { ...person, paid: false, paymentStatus: 'pending', paymentPlan,
      paymentAmount: plans[paymentPlan].amount, paymentSubmittedAt: now };
  }
  function verify(person, admin, now = Date.now()) {
    if (!admin || status(person) !== 'pending') return person;
    return { ...person, paid: true, paymentStatus: 'received', paymentVerifiedAt: now };
  }
  function reset(person, admin, now = Date.now()) {
    if (!admin) return person;
    const next = { ...person, paid: false, paymentStatus: 'unpaid', paymentResetAt: now };
    delete next.paymentSubmittedAt;
    delete next.paymentVerifiedAt;
    return next;
  }
  root.DovePayments = { email, plans, status, label, submit, verify, reset };
})(typeof window !== 'undefined' ? window : globalThis);
