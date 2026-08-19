import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';

export interface CouponEligibilityRecord {
  coupon_id: string;
  coupon_code: string;
  coupon_enabled: boolean;
  coupon_starts_at: Date;
  coupon_ends_at: Date;
  coupon_total_usage_limit: number | null;
  coupon_per_customer_usage_limit: number | null;
  promotion_id: string;
  promotion_name: string;
  promotion_kind: 'percentage' | 'fixed_toman';
  promotion_value: number;
  promotion_max_discount_toman: number | null;
  promotion_min_subtotal_toman: number | null;
  promotion_first_purchase_only: boolean;
  promotion_wholesale_allowed: boolean;
  promotion_total_usage_limit: number | null;
  promotion_per_customer_usage_limit: number | null;
  promotion_stacking: 'exclusive' | 'stackable';
  promotion_starts_at: Date;
  promotion_ends_at: Date;
  promotion_enabled: boolean;
  campaign_id: string;
  campaign_status: 'draft' | 'active' | 'paused' | 'ended' | 'archived';
  campaign_starts_at: Date;
  campaign_ends_at: Date;
}

@Injectable()
export class CouponEligibilityRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async byCode(code: string): Promise<CouponEligibilityRecord | null> {
    const result = await sql<CouponEligibilityRecord>`
      SELECT
        c.id coupon_id,c.code coupon_code,c.enabled coupon_enabled,c.starts_at coupon_starts_at,c.ends_at coupon_ends_at,
        c.total_usage_limit coupon_total_usage_limit,c.per_customer_usage_limit coupon_per_customer_usage_limit,
        p.id promotion_id,p.name promotion_name,p.kind promotion_kind,p.value promotion_value,
        p.max_discount_toman promotion_max_discount_toman,p.min_subtotal_toman promotion_min_subtotal_toman,
        p.first_purchase_only promotion_first_purchase_only,p.wholesale_allowed promotion_wholesale_allowed,
        p.total_usage_limit promotion_total_usage_limit,p.per_customer_usage_limit promotion_per_customer_usage_limit,
        p.stacking promotion_stacking,p.starts_at promotion_starts_at,p.ends_at promotion_ends_at,p.enabled promotion_enabled,
        ca.id campaign_id,ca.status campaign_status,ca.starts_at campaign_starts_at,ca.ends_at campaign_ends_at
      FROM marketing.coupons c
      JOIN marketing.promotions p ON p.id=c.promotion_id
      JOIN marketing.campaigns ca ON ca.id=p.campaign_id
      WHERE c.code=${code}
      LIMIT 1`.execute(this.db);
    return result.rows[0] ?? null;
  }

  async usage(input: { couponId: string; promotionId: string; customerId: string | null }): Promise<{ couponTotal: number; couponCustomer: number; promotionTotal: number; promotionCustomer: number }> {
    const result = await sql<{ coupon_total: string; coupon_customer: string; promotion_total: string; promotion_customer: string }>`
      SELECT
        count(*) FILTER (WHERE coupon_id=${input.couponId}::uuid AND status IN ('reserved','consumed')) coupon_total,
        count(*) FILTER (WHERE coupon_id=${input.couponId}::uuid AND customer_id IS NOT DISTINCT FROM ${input.customerId}::uuid AND status IN ('reserved','consumed')) coupon_customer,
        count(*) FILTER (WHERE promotion_id=${input.promotionId}::uuid AND status IN ('reserved','consumed')) promotion_total,
        count(*) FILTER (WHERE promotion_id=${input.promotionId}::uuid AND customer_id IS NOT DISTINCT FROM ${input.customerId}::uuid AND status IN ('reserved','consumed')) promotion_customer
      FROM marketing.redemptions`.execute(this.db);
    const row = result.rows[0];
    return {
      couponTotal: Number(row?.coupon_total ?? 0),
      couponCustomer: input.customerId ? Number(row?.coupon_customer ?? 0) : 0,
      promotionTotal: Number(row?.promotion_total ?? 0),
      promotionCustomer: input.customerId ? Number(row?.promotion_customer ?? 0) : 0,
    };
  }
}
