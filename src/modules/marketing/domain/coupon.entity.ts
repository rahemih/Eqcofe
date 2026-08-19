import { DomainError } from '../../../shared/errors/domain-error';

const COUPON_CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export interface CouponSnapshot {
  id: string;
  promotionId: string;
  code: string;
  enabled: boolean;
  startsAt: Date;
  endsAt: Date;
  totalUsageLimit: number | null;
  perCustomerUsageLimit: number | null;
}

function limit(value: number | null | undefined, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || value <= 0) throw new DomainError('COUPON_INVALID_LIMIT', `${field} باید عدد صحیح مثبت باشد.`, { field });
  return value;
}

export class CouponEntity {
  private constructor(private state: CouponSnapshot) {}

  static create(input: { id: string; promotionId: string; code: string; startsAt: Date; endsAt: Date; totalUsageLimit?: number | null; perCustomerUsageLimit?: number | null }): CouponEntity {
    const code = input.code.trim().toUpperCase();
    if (!input.id || !input.promotionId || !COUPON_CODE.test(code)) throw new DomainError('COUPON_INVALID', 'شناسه، Promotion و کد Coupon معتبر الزامی است.');
    if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime()) || !(input.endsAt instanceof Date) || Number.isNaN(input.endsAt.getTime()) || input.startsAt >= input.endsAt) throw new DomainError('COUPON_INVALID_WINDOW', 'بازه زمانی Coupon معتبر نیست.');
    return new CouponEntity({ id: input.id, promotionId: input.promotionId, code, enabled: true, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), totalUsageLimit: limit(input.totalUsageLimit, 'totalUsageLimit'), perCustomerUsageLimit: limit(input.perCustomerUsageLimit, 'perCustomerUsageLimit') });
  }

  disable(): void { this.state.enabled = false; }
  enable(now = new Date()): void {
    if (now >= this.state.endsAt) throw new DomainError('COUPON_EXPIRED', 'Coupon منقضی شده است.');
    this.state.enabled = true;
  }

  assertUsable(input: { now: Date; customerId: string | null; totalRedemptions: number; customerRedemptions: number }): void {
    if (!this.state.enabled) throw new DomainError('COUPON_DISABLED', 'Coupon غیرفعال است.');
    if (input.now < this.state.startsAt || input.now >= this.state.endsAt) throw new DomainError('COUPON_OUTSIDE_WINDOW', 'Coupon در این زمان قابل استفاده نیست.');
    if (this.state.totalUsageLimit !== null && input.totalRedemptions >= this.state.totalUsageLimit) throw new DomainError('COUPON_TOTAL_LIMIT', 'سقف استفاده Coupon تکمیل شده است.');
    if (this.state.perCustomerUsageLimit !== null) {
      if (!input.customerId) throw new DomainError('COUPON_CUSTOMER_REQUIRED', 'این Coupon فقط برای مشتری شناسایی‌شده قابل استفاده است.');
      if (input.customerRedemptions >= this.state.perCustomerUsageLimit) throw new DomainError('COUPON_CUSTOMER_LIMIT', 'سقف استفاده مشتری از Coupon تکمیل شده است.');
    }
  }

  snapshot(): CouponSnapshot { return { ...this.state, startsAt: new Date(this.state.startsAt), endsAt: new Date(this.state.endsAt) }; }
}
