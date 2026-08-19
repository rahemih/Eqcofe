import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { evaluatePromotion } from '../domain/promotion-policy';
import { AutomaticPromotionRepository, AutomaticPromotionRecord } from '../infrastructure/automatic-promotion.repository';

export interface AutomaticPromotionInput {
  customerId: string | null;
  subtotalToman: number;
  isWholesale: boolean;
  hasCompletedPurchase: boolean;
  now?: Date;
}

export interface ResolvedAutomaticPromotion {
  promotionId: string;
  campaignId: string;
  name: string;
  discountToman: number;
  stacking: 'exclusive' | 'stackable';
  firstPurchaseOnly: boolean;
}

@Injectable()
export class AutomaticPromotionService {
  constructor(private readonly repo: AutomaticPromotionRepository) {}

  async resolve(input: AutomaticPromotionInput): Promise<{ items: ResolvedAutomaticPromotion[]; totalDiscountToman: number }> {
    if (!Number.isSafeInteger(input.subtotalToman) || input.subtotalToman < 0) {
      throw new DomainError('PROMOTION_INVALID_TOMAN', 'جمع سبد باید عدد صحیح نامنفی بر حسب تومان باشد.');
    }
    const now = input.now ?? new Date();
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new DomainError('VALIDATION_ERROR', 'زمان ارزیابی معتبر نیست.');
    }

    const candidates = await this.repo.activeAutomatic(now);
    const eligible: ResolvedAutomaticPromotion[] = [];

    for (const row of candidates) {
      if (row.first_purchase_only && !input.customerId) continue;
      const usage = await this.repo.usage({ promotionId: row.promotion_id, customerId: input.customerId });
      const result = evaluatePromotion(this.definition(row), {
        now,
        subtotalToman: input.subtotalToman,
        customerId: input.customerId,
        isWholesale: input.isWholesale,
        hasCompletedPurchase: input.hasCompletedPurchase,
        totalRedemptions: usage.total,
        customerRedemptions: usage.customer,
      });
      if (!result.eligible) continue;
      const discountToman = row.max_discount_toman === null
        ? result.discountToman
        : Math.min(result.discountToman, Number(row.max_discount_toman));
      if (discountToman <= 0) continue;
      eligible.push({
        promotionId: row.promotion_id,
        campaignId: row.campaign_id,
        name: row.name,
        discountToman,
        stacking: row.stacking,
        firstPurchaseOnly: row.first_purchase_only,
      });
    }

    const exclusive = eligible.filter(x => x.stacking === 'exclusive')
      .sort((a, b) => b.discountToman - a.discountToman || a.promotionId.localeCompare(b.promotionId));
    if (exclusive.length > 0) {
      const winner = exclusive[0];
      return { items: [winner], totalDiscountToman: Math.min(input.subtotalToman, winner.discountToman) };
    }

    const stackable = eligible.filter(x => x.stacking === 'stackable')
      .sort((a, b) => a.promotionId.localeCompare(b.promotionId));
    const total = Math.min(input.subtotalToman, stackable.reduce((sum, x) => sum + x.discountToman, 0));
    return { items: stackable, totalDiscountToman: total };
  }

  private definition(row: AutomaticPromotionRecord) {
    return {
      id: row.promotion_id,
      campaignId: row.campaign_id,
      name: row.name,
      kind: row.kind,
      value: Number(row.value),
      stacking: row.stacking,
      eligibility: {
        startsAt: new Date(row.starts_at),
        endsAt: new Date(row.ends_at),
        minimumSubtotalToman: row.min_subtotal_toman ?? undefined,
        firstPurchaseOnly: row.first_purchase_only,
        allowWholesale: row.wholesale_allowed,
        totalUsageLimit: row.total_usage_limit ?? undefined,
        perCustomerUsageLimit: row.per_customer_usage_limit ?? undefined,
      },
    } as const;
  }
}
