import { DomainError } from '../../../shared/errors/domain-error';
import { PromotionDefinition, PromotionEvaluationContext, PromotionEvaluationResult } from './marketing.types';

function integerToman(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new DomainError('PROMOTION_INVALID_TOMAN', `${field} باید عدد صحیح نامنفی بر حسب تومان باشد.`, { field });
  }
  return n;
}

function positiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new DomainError('PROMOTION_INVALID_LIMIT', `${field} باید عدد صحیح مثبت باشد.`, { field });
  }
  return n;
}

export function validatePromotion(definition: PromotionDefinition): PromotionDefinition {
  if (!definition.id || !definition.campaignId || !definition.name.trim()) {
    throw new DomainError('PROMOTION_REQUIRED_FIELDS', 'شناسه، کمپین و نام تخفیف الزامی هستند.');
  }
  if (!(definition.eligibility.startsAt instanceof Date) || Number.isNaN(definition.eligibility.startsAt.getTime()) || !(definition.eligibility.endsAt instanceof Date) || Number.isNaN(definition.eligibility.endsAt.getTime())) {
    throw new DomainError('PROMOTION_INVALID_WINDOW', 'بازه زمانی تخفیف معتبر نیست.');
  }
  if (definition.eligibility.startsAt >= definition.eligibility.endsAt) {
    throw new DomainError('PROMOTION_INVALID_WINDOW', 'زمان پایان باید بعد از زمان شروع باشد.');
  }
  if (definition.kind === 'percentage') {
    if (!Number.isInteger(definition.value) || definition.value < 1 || definition.value > 100) {
      throw new DomainError('PROMOTION_INVALID_PERCENT', 'درصد تخفیف باید عدد صحیح بین ۱ تا ۱۰۰ باشد.');
    }
  } else {
    if (integerToman(definition.value, 'value') <= 0) {
      throw new DomainError('PROMOTION_INVALID_FIXED', 'تخفیف ثابت باید بیش از صفر تومان باشد.');
    }
  }
  if (definition.eligibility.minimumSubtotalToman !== undefined) integerToman(definition.eligibility.minimumSubtotalToman, 'minimumSubtotalToman');
  if (definition.eligibility.totalUsageLimit !== undefined) positiveInt(definition.eligibility.totalUsageLimit, 'totalUsageLimit');
  if (definition.eligibility.perCustomerUsageLimit !== undefined) positiveInt(definition.eligibility.perCustomerUsageLimit, 'perCustomerUsageLimit');
  return { ...definition, name: definition.name.trim(), stacking: definition.stacking ?? 'exclusive' };
}

export function evaluatePromotion(raw: PromotionDefinition, ctx: PromotionEvaluationContext): PromotionEvaluationResult {
  const definition = validatePromotion(raw);
  const subtotalToman = integerToman(ctx.subtotalToman, 'subtotalToman');
  if (ctx.now < definition.eligibility.startsAt || ctx.now >= definition.eligibility.endsAt) return { eligible: false, reason: 'OUTSIDE_ACTIVE_WINDOW', discountToman: 0 };
  if (definition.eligibility.minimumSubtotalToman !== undefined && subtotalToman < definition.eligibility.minimumSubtotalToman) return { eligible: false, reason: 'MINIMUM_SUBTOTAL_NOT_MET', discountToman: 0 };
  if (definition.eligibility.firstPurchaseOnly && ctx.hasCompletedPurchase) return { eligible: false, reason: 'NOT_FIRST_PURCHASE', discountToman: 0 };
  if (ctx.isWholesale && definition.eligibility.allowWholesale !== true) return { eligible: false, reason: 'WHOLESALE_NOT_ALLOWED', discountToman: 0 };
  if (definition.eligibility.totalUsageLimit !== undefined && ctx.totalRedemptions >= definition.eligibility.totalUsageLimit) return { eligible: false, reason: 'TOTAL_USAGE_LIMIT_REACHED', discountToman: 0 };
  if (definition.eligibility.perCustomerUsageLimit !== undefined) {
    if (!ctx.customerId) return { eligible: false, reason: 'CUSTOMER_REQUIRED', discountToman: 0 };
    if (ctx.customerRedemptions >= definition.eligibility.perCustomerUsageLimit) return { eligible: false, reason: 'CUSTOMER_USAGE_LIMIT_REACHED', discountToman: 0 };
  }
  const rawDiscount = definition.kind === 'percentage' ? Math.floor(subtotalToman * definition.value / 100) : definition.value;
  return { eligible: true, reason: null, discountToman: Math.min(subtotalToman, integerToman(rawDiscount, 'discountToman')) };
}
