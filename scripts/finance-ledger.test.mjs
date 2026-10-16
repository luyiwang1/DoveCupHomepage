import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import '../player-identity.js';
import '../finance-ledger.js';
const ledger = globalThis.DoveFinance;
const row = (id, extra = {}) => ({ id, name: 'Han M', date: '2026-10-17', venueKey: 'mrtc', type: 'payment', plan: 'package10', amount: 350, ...extra });

test('keeps money, package usage and actual attendance as separate records', () => {
  let rows = ledger.append([], row('purchase'));
  assert.equal(ledger.summary(rows, 'Han').attended, 0);
  rows = ledger.append(rows, row('use', { name: 'Han', type: 'usage' }));
  rows = ledger.append(rows, row('single', { date: '2026-10-24', plan: 'single', amount: 40 }));
  rows = ledger.append(rows, row('attend', { date: '2026-10-24', type: 'attendance' }));
  const summary = ledger.summary(rows, 'Han M');
  assert.equal(summary.received, 390);
  assert.equal(summary.remaining, 9);
  assert.equal(summary.used, 1);
  assert.equal(summary.attended, 2);
  assert.equal(ledger.members(rows).length, 1);
  assert.equal(ledger.validate(rows).length, 4);
});
test('prevents duplicate same-session check-in across aliases and payment types', () => {
  const rows = ledger.append(ledger.append([], row('buy')), row('use', { type: 'usage' }));
  assert.throws(() => ledger.append(rows, row('again', { name: 'Han', type: 'attendance' })), /已经记录到场/);
  const otherVenue = ledger.append(rows, row('nyta', { type: 'usage', venueKey: 'nyta-east' }));
  assert.equal(ledger.summary(otherVenue, 'Han').remaining, 8);
  assert.equal(ledger.summary(otherVenue, 'Han').attended, 2);
});
test('does not permit negative balances and restores one visit on a reversal', () => {
  assert.throws(() => ledger.append([], row('use', { type: 'usage' })), /余额不足/);
  let rows = ledger.append(ledger.append([], row('buy')), row('use', { type: 'usage' }));
  rows = ledger.append(rows, row('undo', { type: 'reversal', reverses: 'use' }));
  assert.equal(ledger.summary(rows, 'Han').remaining, 10);
  assert.equal(ledger.summary(rows, 'Han').attended, 0);
  assert.throws(() => ledger.append(rows, row('undo2', { type: 'reversal', reverses: 'use' })), /已撤销/);
  assert.equal(ledger.append(rows, row('use-again', { type: 'usage' })).length, 4);
});
test('refunds preserve the original receipt and cannot overdraw package visits', () => {
  let rows = ledger.append(ledger.append([], row('buy')), row('use', { type: 'usage' }));
  assert.throws(() => ledger.append(rows, row('refund', { type: 'refund', reverses: 'buy' })), /套餐已使用/);
  rows = ledger.append(rows, row('undo', { type: 'reversal', reverses: 'use' }));
  rows = ledger.append(rows, row('refund', { type: 'refund', reverses: 'buy' }));
  assert.equal(ledger.summary(rows, 'Han').received, 0);
  assert.equal(ledger.summary(rows, 'Han').remaining, 0);
  assert.equal(rows[0].amountCents, 35000);
});
test('validates backup totals, duplicates and calendar dates', () => {
  const rows = ledger.append([], row('one'));
  assert.throws(() => ledger.validate([...rows, ...rows]), /重复或无效/);
  assert.throws(() => ledger.validate([{ ...rows[0], visits: 100 }]), /重复或无效/);
  assert.throws(() => ledger.append([], row('bad-date', { date: '2026-02-30' })), /活动日期/);
  assert.equal(ledger.append(rows, row('one')), rows);
});
test('financial reset preserves only active attendance with zero money and visits', () => {
  let rows = ledger.append([], row('buy'));
  rows = ledger.append(rows, row('used', { type: 'usage' }));
  rows = ledger.append(rows, row('cancelled', { type: 'attendance', date: '2026-10-24' }));
  rows = ledger.append(rows, row('undo', { type: 'reversal', reverses: 'cancelled' }));
  const reset = ledger.zeroFinance(rows);
  assert.equal(reset.length, 1);
  assert.equal(ledger.summary(reset, 'Han').received, 0);
  assert.equal(ledger.summary(reset, 'Han').remaining, 0);
  assert.equal(ledger.summary(reset, 'Han').attended, 1);
  assert.equal(rows[0].amountCents, 35000);
});
test('local receipt imports are idempotent and never infer unknown historic amounts', async () => {
  const values = new Map();
  const root = { DoveFinance: ledger, dispatchEvent() {} };
  vm.runInNewContext(await readFile(new URL('../finance-store.js', import.meta.url), 'utf8'), {
    window: root, localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
    navigator: {}, Event: class {}
  });
  const person = { id: 2, name: 'Han', paymentStatus: 'received', paymentVerifiedAt: 200, paymentSubmittedAt: 100, paymentAmount: 350, paymentPlan: 'package10' };
  const context = { date: '2026-10-17', venueKey: 'mrtc' };
  await root.DoveFinanceStore.recordPayment(person, context);
  await root.DoveFinanceStore.recordPayment(person, context);
  await root.DoveFinanceStore.recordPayment({ id: 3, name: 'Irene', paid: true }, context);
  assert.equal(root.DoveFinanceStore.read().length, 1);
  assert.equal(ledger.summary(root.DoveFinanceStore.read(), 'Han M').remaining, 10);
  await assert.rejects(() => root.DoveFinanceStore.restore([{ ...root.DoveFinanceStore.read()[0], visits: 50 }]), /重复或无效/);
  assert.equal(root.DoveFinanceStore.read().length, 1);
  await root.DoveFinanceStore.add(row('attendance', { type: 'usage' }));
  await root.DoveFinanceStore.resetFinance();
  assert.equal(root.DoveFinanceStore.resetBackup().entries.length, 2);
  assert.equal(ledger.summary(root.DoveFinanceStore.read(), 'Han').received, 0);
  assert.equal(ledger.summary(root.DoveFinanceStore.read(), 'Han').attended, 1);
  await root.DoveFinanceStore.recordPayment(person, context);
  assert.equal(root.DoveFinanceStore.read().length, 1);
  await root.DoveFinanceStore.recordPayment({ ...person, id: 4, paymentVerifiedAt: Date.now() + 1000 }, context);
  assert.equal(ledger.summary(root.DoveFinanceStore.read(), 'Han').remaining, 10);
});
