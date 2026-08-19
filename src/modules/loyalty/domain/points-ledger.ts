import { DomainError } from '../../../shared/errors/domain-error';

export type LoyaltyEntryType = 'earn' | 'redeem' | 'expire' | 'adjust';

export interface LoyaltyEntry {
  id: string;
  customerId: string;
  type: LoyaltyEntryType;
  pointsDelta: number;
  referenceType: string;
  referenceId: string;
}

function assertPoints(value: number, allowNegative = false): number {
  if (!Number.isSafeInteger(value) || value === 0 || (!allowNegative && value < 0)) {
    throw new DomainError('LOYALTY_INVALID_POINTS', 'امتیاز باید عدد صحیح معتبر باشد.');
  }
  return value;
}

export class LoyaltyPointsLedger {
  private readonly entries: LoyaltyEntry[] = [];

  constructor(public readonly customerId: string) {
    if (!customerId) throw new DomainError('LOYALTY_CUSTOMER_REQUIRED', 'شناسه مشتری برای باشگاه مشتریان الزامی است.');
  }

  balance(): number { return this.entries.reduce((sum, entry) => sum + entry.pointsDelta, 0); }

  earn(input: { id: string; points: number; referenceType: string; referenceId: string }): void {
    this.add({ id: input.id, customerId: this.customerId, type: 'earn', pointsDelta: assertPoints(input.points), referenceType: input.referenceType, referenceId: input.referenceId });
  }

  redeem(input: { id: string; points: number; referenceType: string; referenceId: string }): void {
    const points = assertPoints(input.points);
    if (points > this.balance()) throw new DomainError('LOYALTY_INSUFFICIENT_POINTS', 'امتیاز کافی نیست.');
    this.add({ id: input.id, customerId: this.customerId, type: 'redeem', pointsDelta: -points, referenceType: input.referenceType, referenceId: input.referenceId });
  }

  expire(input: { id: string; points: number; referenceType: string; referenceId: string }): void {
    const points = assertPoints(input.points);
    if (points > this.balance()) throw new DomainError('LOYALTY_INSUFFICIENT_POINTS', 'امتیاز کافی برای انقضا وجود ندارد.');
    this.add({ id: input.id, customerId: this.customerId, type: 'expire', pointsDelta: -points, referenceType: input.referenceType, referenceId: input.referenceId });
  }

  adjust(input: { id: string; pointsDelta: number; referenceType: string; referenceId: string }): void {
    const delta = assertPoints(input.pointsDelta, true);
    if (this.balance() + delta < 0) throw new DomainError('LOYALTY_NEGATIVE_BALANCE', 'موجودی امتیاز نمی‌تواند منفی شود.');
    this.add({ id: input.id, customerId: this.customerId, type: 'adjust', pointsDelta: delta, referenceType: input.referenceType, referenceId: input.referenceId });
  }

  toToman(): never {
    throw new DomainError('LOYALTY_CASH_CONVERSION_FORBIDDEN', 'امتیاز باشگاه مشتریان ارزش نقدی یا موجودی کیف پول نیست.');
  }

  snapshot(): readonly LoyaltyEntry[] { return this.entries.map((entry) => ({ ...entry })); }

  private add(entry: LoyaltyEntry): void {
    if (!entry.id || !entry.referenceType || !entry.referenceId) throw new DomainError('LOYALTY_REFERENCE_REQUIRED', 'شناسه و مرجع Ledger الزامی است.');
    if (this.entries.some((existing) => existing.id === entry.id)) throw new DomainError('LOYALTY_DUPLICATE_ENTRY', 'ثبت تکراری Ledger مجاز نیست.');
    this.entries.push({ ...entry });
  }
}
