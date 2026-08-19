import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LoyaltyPointsLedger } from '../src/modules/loyalty/domain/points-ledger';

const migration=fs.readFileSync('database/migrations/0041_loyalty_points_mvp_foundation.sql','utf8');
const service=fs.readFileSync('src/modules/loyalty/application/points.service.ts','utf8');
const repo=fs.readFileSync('src/modules/loyalty/infrastructure/points.repository.ts','utf8');

test('A9 keeps points non-cash and forbids Toman conversion',()=>{
  const l=new LoyaltyPointsLedger('c'); l.earn({id:'e',points:10,referenceType:'test',referenceId:'1'});
  assert.throws(()=>l.toToman(),/ارزش نقدی/);
  assert.doesNotMatch(service,/wallet|toman/i);
});

test('A9 earn redeem expire and adjust preserve integer non-negative balance',()=>{
  const l=new LoyaltyPointsLedger('c');
  l.earn({id:'e',points:100,referenceType:'order',referenceId:'1'});
  l.redeem({id:'r',points:30,referenceType:'benefit',referenceId:'1'});
  l.expire({id:'x',points:10,referenceType:'expiry',referenceId:'1'});
  l.adjust({id:'a',pointsDelta:5,referenceType:'admin',referenceId:'1'});
  assert.equal(l.balance(),65);
  assert.throws(()=>l.redeem({id:'bad',points:66,referenceType:'benefit',referenceId:'2'}));
});

test('A9 reversal is exact immutable compensation and cannot reverse twice',()=>{
  const l=new LoyaltyPointsLedger('c');
  l.earn({id:'e',points:20,referenceType:'order',referenceId:'1'});
  l.reverse({id:'rv',entryId:'e',referenceType:'order_cancel',referenceId:'1'});
  assert.equal(l.balance(),0);
  assert.throws(()=>l.reverse({id:'rv2',entryId:'e',referenceType:'order_cancel',referenceId:'2'}));
});

test('A9 database serializes customer balance mutations',()=>{
  assert.match(migration,/pg_advisory_xact_lock\(hashtextextended\(NEW\.customer_id::text, 46\)\)/);
  assert.match(migration,/LOYALTY_NEGATIVE_BALANCE/);
});

test('A9 ledger rows are append-only',()=>{
  assert.match(migration,/BEFORE UPDATE OR DELETE ON loyalty\.points_entries/);
  assert.match(migration,/LOYALTY_LEDGER_IMMUTABLE/);
});

test('A9 reversal references exactly one original entry',()=>{
  assert.match(migration,/reverses_entry_id uuid NULL REFERENCES loyalty\.points_entries\(id\) ON DELETE RESTRICT/);
  assert.match(migration,/uq_loyalty_points_single_reversal/);
  assert.match(migration,/NEW\.points_delta<>-original\.points_delta/);
});

test('A9 repository balance is derived from ledger, never stored as mutable balance',()=>{
  assert.match(repo,/COALESCE\(sum\(points_delta\),0\) balance/);
  assert.doesNotMatch(migration,/CREATE TABLE[^;]*(wallet|balance_toman)/i);
});

test('A9 reference idempotency remains database enforced',()=>{
  assert.match(repo,/ON CONFLICT\(customer_id,entry_type,reference_type,reference_id\) DO NOTHING/);
  assert.match(service,/Number\(existing\.points_delta\)===delta/);
});

test('A9 customer operations fail closed for inactive customers',()=>{
  assert.match(service,/c\.status!=='active'/);
  assert.match(service,/CUSTOMER_NOT_ACTIVE/);
});

test('A9 does not invent automatic order-to-points monetary conversion policy',()=>{
  assert.doesNotMatch(migration,/AFTER UPDATE[^;]*orders\.orders/i);
  assert.doesNotMatch(service,/total_toman|subtotal_toman|conversion_rate|points_per_toman/i);
});
