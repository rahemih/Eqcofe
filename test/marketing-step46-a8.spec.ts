import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RedemptionAggregate } from '../src/modules/marketing/domain/redemption.aggregate';

const core=fs.readFileSync('database/migrations/0039_marketing_redemption_integrity.sql','utf8');
const hardening=fs.readFileSync('database/migrations/0040_marketing_redemption_runtime_hardening.sql','utf8');
const sql=core+'\n'+hardening;

test('A8 binds redemption rows to authoritative checkout and order records',()=>{
  assert.match(core,/FOREIGN KEY\(checkout_id\) REFERENCES cart\.checkouts\(id\) ON DELETE RESTRICT/);
  assert.match(core,/FOREIGN KEY\(order_id\) REFERENCES orders\.orders\(id\) ON DELETE RESTRICT/);
});

test('A8 validates immutable checkout marketing snapshot before reservation',()=>{
  assert.match(sql,/assert_checkout_snapshot_shape/);
  assert.match(sql,/MARKETING_SNAPSHOT_DISCOUNT_MISMATCH/);
  assert.match(sql,/MARKETING_PRICING_NET_MISMATCH/);
  assert.match(sql,/MARKETING_DUPLICATE_PROMOTION_SNAPSHOT/);
});

test('A8 reservation is serialized for promotion and coupon usage limits',()=>{
  assert.match(hardening,/pg_advisory_xact_lock\(hashtextextended\('marketing-promotion:'/);
  assert.match(hardening,/pg_advisory_xact_lock\(hashtextextended\('marketing-coupon:'/);
  assert.match(hardening,/status IN \('reserved','consumed'\)/);
  assert.match(hardening,/MARKETING_PROMOTION_TOTAL_LIMIT_REACHED/);
  assert.match(hardening,/MARKETING_COUPON_TOTAL_LIMIT_REACHED/);
});

test('A8 first purchase reservation is customer serialized and rechecks paid history',()=>{
  assert.match(hardening,/marketing-first-purchase:/);
  assert.match(hardening,/payment_status='paid'/);
  assert.match(hardening,/MARKETING_FIRST_PURCHASE_ALREADY_COMPLETED/);
  assert.match(hardening,/MARKETING_FIRST_PURCHASE_ALREADY_RESERVED/);
});

test('A8 checkout transition reserves and expiry releases redemptions atomically',()=>{
  assert.match(core,/AFTER UPDATE OF status ON cart\.checkouts[\s\S]*NEW\.status='reserved'/);
  assert.match(core,/SET status='released',released_at=now\(\)/);
  assert.match(core,/OLD\.status='reserved' AND NEW\.status IN \('expired','cancelled'\)/);
});

test('A8 order insert consumes exact checkout redemption snapshot',()=>{
  assert.match(core,/AFTER INSERT ON orders\.orders/);
  assert.match(core,/SET status='consumed',order_id=NEW\.id,consumed_at=now\(\)/);
  assert.match(core,/MARKETING_ORDER_REDEMPTION_MISMATCH/);
});

test('A8 cancelled or expired order reverses consumed redemption without deleting history',()=>{
  assert.match(core,/SET status='reversed',reversed_at=now\(\)/);
  assert.match(core,/NEW\.status IN \('cancelled','expired'\)/);
  assert.doesNotMatch(core,/DELETE FROM marketing\.redemptions/);
});

test('A8 database transition guard mirrors frozen domain lifecycle',()=>{
  assert.match(core,/OLD\.status='reserved' AND NEW\.status IN \('consumed','released'\)/);
  assert.match(core,/OLD\.status='consumed' AND NEW\.status='reversed'/);
  assert.match(core,/MARKETING_REDEMPTION_INVALID_TRANSITION/);
  assert.match(core,/MARKETING_REDEMPTION_FACT_IMMUTABLE/);
});

test('A8 financial constraint trigger is deferred to transaction end',()=>{
  assert.match(core,/CREATE CONSTRAINT TRIGGER trg_marketing_redemption_financial_integrity/);
  assert.match(core,/DEFERRABLE INITIALLY DEFERRED/);
  assert.match(hardening,/MARKETING_ORDER_FINANCIAL_MISMATCH/);
  assert.match(hardening,/MARKETING_CHECKOUT_REDEMPTION_MISMATCH/);
});

test('A8 terminal order integrity accepts reversed history while preserving exact discount',()=>{
  assert.match(hardening,/o\.status IN \('cancelled','expired'\)[\s\S]*status='reversed'/);
  assert.match(hardening,/matched_sum<>o\.marketing_discount_toman OR matched_count<>app_count/);
  assert.match(hardening,/c\.status='order_created'[\s\S]*status IN \('consumed','reversed'\)/);
});

test('domain redemption remains idempotent for same-order consume and fail-closed otherwise',()=>{
  const r=new RedemptionAggregate({id:'r',promotionId:'p',couponId:null,customerId:'c',checkoutId:'co',discountToman:100,status:'reserved',orderId:null});
  r.consume('o');
  r.consume('o');
  assert.equal(r.snapshot().status,'consumed');
  assert.throws(()=>r.consume('other'));
  r.reverse('o');
  assert.equal(r.snapshot().status,'reversed');
});
