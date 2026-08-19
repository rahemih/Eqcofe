import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignAggregate } from '../src/modules/marketing/domain/campaign.aggregate';
import { CouponEntity } from '../src/modules/marketing/domain/coupon.entity';
import { RedemptionAggregate } from '../src/modules/marketing/domain/redemption.aggregate';
import { evaluatePromotion, validatePromotion } from '../src/modules/marketing/domain/promotion-policy';
import { PromotionDefinition } from '../src/modules/marketing/domain/marketing.types';
import { LoyaltyPointsLedger } from '../src/modules/loyalty/domain/points-ledger';
import { DomainError } from '../src/shared/errors/domain-error';

const startsAt = new Date('2026-08-01T00:00:00.000Z');
const endsAt = new Date('2026-09-01T00:00:00.000Z');
const promotion = (overrides: Partial<PromotionDefinition> = {}): PromotionDefinition => ({
  id: 'promotion-1', campaignId: 'campaign-1', name: 'خرید اول', kind: 'percentage', value: 10,
  eligibility: { startsAt, endsAt, firstPurchaseOnly: true, perCustomerUsageLimit: 1 },
  ...overrides,
});

test('campaign lifecycle rejects archive while active', () => {
  const c = CampaignAggregate.create({ id: 'campaign-1', name: 'جشنواره', startsAt, endsAt });
  c.activate(new Date('2026-08-10T00:00:00.000Z'));
  assert.throws(() => c.archive(), (e: unknown) => e instanceof DomainError && e.code === 'CAMPAIGN_ARCHIVE_ACTIVE');
  c.pause(); c.archive(); assert.equal(c.status, 'archived');
});

test('promotion defaults to exclusive stacking and never discounts below zero', () => {
  const p = validatePromotion({ ...promotion(), kind: 'fixed_toman', value: 50000, eligibility: { startsAt, endsAt } });
  assert.equal(p.stacking, 'exclusive');
  const result = evaluatePromotion(p, { customerId: null, subtotalToman: 30000, isWholesale: false, hasCompletedPurchase: false, totalRedemptions: 0, customerRedemptions: 0, now: new Date('2026-08-10T00:00:00.000Z') });
  assert.deepEqual(result, { eligible: true, reason: null, discountToman: 30000 });
});

test('first-purchase promotion trusts completed-purchase fact and rejects returning customer', () => {
  const result = evaluatePromotion(promotion(), { customerId: 'customer-1', subtotalToman: 100000, isWholesale: false, hasCompletedPurchase: true, totalRedemptions: 0, customerRedemptions: 0, now: new Date('2026-08-10T00:00:00.000Z') });
  assert.equal(result.eligible, false); assert.equal(result.reason, 'NOT_FIRST_PURCHASE');
});

test('wholesale is denied unless promotion explicitly allows it', () => {
  const result = evaluatePromotion(promotion({ eligibility: { startsAt, endsAt } }), { customerId: 'customer-1', subtotalToman: 100000, isWholesale: true, hasCompletedPurchase: false, totalRedemptions: 0, customerRedemptions: 0, now: new Date('2026-08-10T00:00:00.000Z') });
  assert.equal(result.reason, 'WHOLESALE_NOT_ALLOWED');
});

test('coupon normalizes code and enforces per-customer usage', () => {
  const c = CouponEntity.create({ id: 'coupon-1', promotionId: 'promotion-1', code: ' eq10 ', startsAt, endsAt, perCustomerUsageLimit: 1 });
  assert.equal(c.snapshot().code, 'EQ10');
  assert.throws(() => c.assertUsable({ now: new Date('2026-08-10T00:00:00.000Z'), customerId: 'customer-1', totalRedemptions: 0, customerRedemptions: 1 }), (e: unknown) => e instanceof DomainError && e.code === 'COUPON_CUSTOMER_LIMIT');
});

test('redemption consume is idempotent only for same order and release cannot follow consumption', () => {
  const r = RedemptionAggregate.reserve({ id: 'redemption-1', promotionId: 'promotion-1', checkoutId: 'checkout-1', customerId: 'customer-1', discountToman: 10000 });
  r.consume('order-1'); r.consume('order-1');
  assert.throws(() => r.release(), (e: unknown) => e instanceof DomainError && e.code === 'REDEMPTION_RELEASE_INVALID');
  assert.equal(r.snapshot().status, 'consumed');
});

test('loyalty ledger is integer points, prevents negative balance and forbids Toman conversion', () => {
  const ledger = new LoyaltyPointsLedger('customer-1');
  ledger.earn({ id: 'entry-1', points: 100, referenceType: 'order', referenceId: 'order-1' });
  ledger.redeem({ id: 'entry-2', points: 40, referenceType: 'reward', referenceId: 'reward-1' });
  assert.equal(ledger.balance(), 60);
  assert.throws(() => ledger.redeem({ id: 'entry-3', points: 61, referenceType: 'reward', referenceId: 'reward-2' }), (e: unknown) => e instanceof DomainError && e.code === 'LOYALTY_INSUFFICIENT_POINTS');
  assert.throws(() => ledger.toToman(), (e: unknown) => e instanceof DomainError && e.code === 'LOYALTY_WALLET_FORBIDDEN');
});
