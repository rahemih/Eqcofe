import { DomainError } from '../../../shared/errors/domain-error';
import { RedemptionStatus } from './marketing.types';

export interface RedemptionSnapshot {
  id: string;
  promotionId: string;
  couponId: string | null;
  customerId: string | null;
  checkoutId: string;
  orderId: string | null;
  discountToman: number;
  status: RedemptionStatus;
}

export class RedemptionAggregate {
  private constructor(private state: RedemptionSnapshot) {}

  static reserve(input: { id: string; promotionId: string; couponId?: string | null; customerId?: string | null; checkoutId: string; discountToman: number }): RedemptionAggregate {
    if (!input.id || !input.promotionId || !input.checkoutId) throw new DomainError('REDEMPTION_REQUIRED_FIELDS', 'شناسه Redemption، Promotion و Checkout الزامی است.');
    if (!Number.isSafeInteger(input.discountToman) || input.discountToman < 0) throw new DomainError('REDEMPTION_INVALID_DISCOUNT', 'مبلغ تخفیف باید عدد صحیح نامنفی بر حسب تومان باشد.');
    return new RedemptionAggregate({ id: input.id, promotionId: input.promotionId, couponId: input.couponId ?? null, customerId: input.customerId ?? null, checkoutId: input.checkoutId, orderId: null, discountToman: input.discountToman, status: 'reserved' });
  }

  consume(orderId: string): void {
    if (!orderId) throw new DomainError('REDEMPTION_ORDER_REQUIRED', 'شناسه سفارش الزامی است.');
    if (this.state.status === 'consumed' && this.state.orderId === orderId) return;
    if (this.state.status !== 'reserved') throw new DomainError('REDEMPTION_CONSUME_INVALID', 'Redemption از وضعیت فعلی قابل مصرف نیست.');
    this.state.status = 'consumed';
    this.state.orderId = orderId;
  }

  release(): void {
    if (this.state.status === 'released') return;
    if (this.state.status !== 'reserved') throw new DomainError('REDEMPTION_RELEASE_INVALID', 'فقط Redemption رزروشده قابل آزادسازی است.');
    this.state.status = 'released';
  }

  reverse(orderId: string): void {
    if (this.state.status === 'reversed' && this.state.orderId === orderId) return;
    if (this.state.status !== 'consumed' || this.state.orderId !== orderId) throw new DomainError('REDEMPTION_REVERSE_INVALID', 'فقط Redemption مصرف‌شده همان سفارش قابل برگشت است.');
    this.state.status = 'reversed';
  }

  snapshot(): RedemptionSnapshot { return { ...this.state }; }
}
