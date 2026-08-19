import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const m=readFileSync(new URL('../database/migrations/0026_customer_core.sql',import.meta.url),'utf8');

test('address book is customer-owned and enforces a single default',()=>{
  assert.match(m,/CREATE TABLE IF NOT EXISTS customer\.addresses/);
  assert.match(m,/REFERENCES customer\.customers\(id\)/);
  assert.match(m,/CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_addresses_one_default_shipping/);
  assert.match(m,/WHERE is_default_shipping/);
});

test('wishlist is an idempotent set and keeps Catalog authoritative',()=>{
  assert.match(m,/CREATE TABLE IF NOT EXISTS customer\.wishlist_items/);
  assert.match(m,/PRIMARY KEY\(customer_id,product_id\)/);
  assert.match(m,/REFERENCES catalog\.products\(id\) ON DELETE RESTRICT/);
  assert.doesNotMatch(m,/product_(title|price|stock|media)/i);
});

test('wholesale lifecycle and active application uniqueness are database protected',()=>{
  assert.match(m,/status IN \('submitted','under_review','approved','rejected'\)/);
  assert.match(m,/uq_customer_wholesale_one_active_application/);
  assert.match(m,/CUSTOMER_WHOLESALE_INVALID_TRANSITION/);
  assert.match(m,/CUSTOMER_WHOLESALE_DECISION_IMMUTABLE/);
});

test('approval and authoritative customer type cannot diverge at commit',()=>{
  assert.match(m,/CUSTOMER_WHOLESALE_APPROVAL_REQUIRED/);
  assert.match(m,/CUSTOMER_WHOLESALE_APPROVAL_NOT_PROMOTED/);
  assert.match(m,/CREATE CONSTRAINT TRIGGER trg_customer_wholesale_approved_promoted/);
  assert.match(m,/DEFERRABLE INITIALLY DEFERRED/);
});

test('review concurrency has row locking, immutable reviewer and optimistic version',()=>{
  assert.match(m,/FOR UPDATE/);
  assert.match(m,/CUSTOMER_WHOLESALE_REVIEWER_IMMUTABLE/);
  assert.match(m,/CUSTOMER_WHOLESALE_VERSION_MUST_INCREMENT/);
});
