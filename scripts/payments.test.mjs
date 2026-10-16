import assert from 'node:assert/strict';
import test from 'node:test';
import '../payments.js';
import { buildReset } from './weekly-reset.mjs';
const pay = globalThis.DovePayments;

test('owner submits pending payment and only an admin can confirm it', () => {
  const person = { id: 1, name: 'Han M', paid: false };
  assert.equal(pay.submit(person, 'single', false), person);
  const pending = pay.submit(person, 'single', true, 100);
  assert.equal(pay.status(pending), 'pending');
  assert.equal(pending.paid, false);
  assert.equal(pending.paymentAmount, 40);
  assert.equal(pay.verify(pending, false), pending);
  assert.equal(pay.submit(pending, 'package10', true), pending);
  const received = pay.verify(pending, true, 200);
  assert.equal(received.paid, true);
  assert.equal(received.paymentVerifiedAt, 200);
  assert.equal(pay.reset(received, false), received);
  assert.equal(pay.status(pay.reset(received, true)), 'unpaid');
});
test('packages cost 350 and legacy paid records retain their state', () => {
  assert.equal(pay.submit({ paid: false }, 'package10', true).paymentAmount, 350);
  assert.equal(pay.status({ paid: true }), 'received');
  assert.equal(pay.email, 'wangluyi1997@gmail.com');
});
test('archives preserve pending payment details without marking them received', () => {
  const person = pay.submit({ id: 1, name: 'Han M' }, 'package10', true, 100);
  const archive = buildReset({ main: { state: { joined: [person] } } }, '2026-10-17').data.signupHistory['2026-10-17'].joined[0];
  assert.equal(archive.paymentStatus, 'pending');
  assert.equal(archive.paid, false);
  assert.equal(archive.paymentAmount, 350);
  assert.equal(archive.paymentSubmittedAt, 100);
});
