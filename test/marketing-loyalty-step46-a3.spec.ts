import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = fs.readFileSync('database/migrations/0034_marketing_loyalty_core.sql','utf8');
const rbac = fs.readFileSync('database/migrations/0035_marketing_loyalty_rbac.sql','utf8');

test('A3 schema creates canonical marketing and loyalty persistence', () => {
  for (const table of [
    'marketing.campaigns',
    'marketing.promotions',
    'marketing.coupons',
    'marketing.redemptions',
    'loyalty.points_entries',
  ]) assert.ok(schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`), table);
});

test('promotion money and percentage invariants are database enforced', () => {
  assert.match(schema,/kind IN \('percentage','fixed_toman'\)/);
  assert.match(schema,/kind='percentage' AND value BETWEEN 1 AND 100/);
  assert.match(schema,/max_discount_toman bigint NULL CHECK\(max_discount_toman IS NULL OR max_discount_toman > 0\)/);
  assert.match(schema,/min_subtotal_toman bigint NULL CHECK\(min_subtotal_toman IS NULL OR min_subtotal_toman >= 0\)/);
  assert.match(schema,/discount_toman bigint NOT NULL CHECK\(discount_toman >= 0\)/);
});

test('redemption persistence has state, idempotency and usage indexes', () => {
  assert.match(schema,/status IN \('reserved','consumed','released','reversed'\)/);
  assert.match(schema,/ck_marketing_redemption_state/);
  assert.match(schema,/uq_marketing_redemption_promotion_checkout/);
  assert.match(schema,/uq_marketing_redemption_coupon_checkout/);
  assert.match(schema,/uq_marketing_redemption_promotion_order/);
  assert.match(schema,/ix_marketing_redemptions_customer_promotion/);
});

test('coupon codes and usage limits fail closed at persistence boundary', () => {
  assert.match(schema,/code = upper\(btrim\(code\)\)/);
  assert.match(schema,/uq_marketing_coupon_code/);
  assert.ok((schema.match(/per_customer_usage_limit integer NULL CHECK\(per_customer_usage_limit IS NULL OR per_customer_usage_limit > 0\)/g) || []).length >= 2);
  assert.ok((schema.match(/total_usage_limit integer NULL CHECK\(total_usage_limit IS NULL OR total_usage_limit > 0\)/g) || []).length >= 2);
});

test('loyalty points ledger is non-cash integer ledger and guards negative balance under concurrency', () => {
  assert.match(schema,/points_delta bigint NOT NULL CHECK\(points_delta <> 0\)/);
  assert.match(schema,/ck_loyalty_points_direction/);
  assert.match(schema,/uq_loyalty_points_reference/);
  assert.match(schema,/pg_advisory_xact_lock/);
  assert.match(schema,/LOYALTY_NEGATIVE_BALANCE/);
});

test('A3 RBAC is additive, explicit and risk classified', () => {
  for (const permission of [
    'marketing.view',
    'marketing.manage',
    'marketing.activate',
    'marketing.redemption.view',
    'marketing.redemption.manage',
    'loyalty.view',
    'loyalty.adjust',
  ]) assert.ok(rbac.includes(`'${permission}'`), permission);
  assert.match(rbac,/ON CONFLICT \(key\) DO NOTHING/);
  assert.match(rbac,/'marketing\.activate'.*'critical'/s);
  assert.match(rbac,/'loyalty\.adjust'.*'critical'/s);
});
