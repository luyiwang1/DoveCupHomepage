import test from 'node:test';
import assert from 'node:assert/strict';
import '../player-identity.js';
import '../finance-ledger.js';
import '../finance-reconciliation.js';
const audit=globalThis.DoveFinanceReconciliation;
test('shows Irene pending without inventing a received ledger entry',()=>{
  const sources=[{current:true,venueKey:'mrtc',date:'2026-11-07',people:[{id:1,name:'Irene',paymentStatus:'pending',paymentPlan:'single',paymentAmount:40}]}];
  const rows=audit.rows(sources,[]);
  assert.equal(rows.length,1);assert.equal(rows[0].ledgerState,'pending');assert.equal(rows[0].amount,40);
});
test('distinguishes matched, reset, incomplete and unmatched receipts including waitlist sources',()=>{
  const people=[{id:1,name:'A',paymentStatus:'received',paymentAmount:350,paymentVerifiedAt:200},{id:2,name:'B',paymentStatus:'received',paymentAmount:40,paymentVerifiedAt:50},{id:3,name:'C',paid:true},{id:4,name:'D',paymentStatus:'received',paymentAmount:40,paymentVerifiedAt:200}];
  const sources=[{current:true,venueKey:'nyta-east',date:'2026-11-07',people}];
  const ref=audit.reference(people[0],sources[0]);
  const entries=globalThis.DoveFinance.append([],{id:'receipt',reference:ref,name:'A',type:'payment',plan:'package10',amount:350,date:'2026-11-07',venueKey:'nyta-east'});
  assert.deepEqual(audit.rows(sources,entries,100).map(r=>r.ledgerState),['recorded','reset','legacy','missing']);
});
