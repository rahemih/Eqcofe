import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';

export interface AutomaticPromotionRecord {
  promotion_id: string;
  campaign_id: string;
  name: string;
  kind: 'percentage' | 'fixed_toman';
  value: number;
  max_discount_toman: number | null;
  min_subtotal_toman: number | null;
  first_purchase_only: boolean;
  wholesale_allowed: boolean;
  total_usage_limit: number | null;
  per_customer_usage_limit: number | null;
  stacking: 'exclusive' | 'stackable';
  starts_at: Date;
  ends_at: Date;
}

@Injectable()
export class AutomaticPromotionRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async activeAutomatic(now: Date): Promise<AutomaticPromotionRecord[]> {
    const result = await sql<AutomaticPromotionRecord>`
      SELECT p.id promotion_id,p.campaign_id,p.name,p.kind,p.value,p.max_discount_toman,p.min_subtotal_toman,
             p.first_purchase_only,p.wholesale_allowed,p.total_usage_limit,p.per_customer_usage_limit,p.stacking,p.starts_at,p.ends_at
      FROM marketing.promotions p
      JOIN marketing.campaigns c ON c.id=p.campaign_id
      WHERE c.status='active'
        AND ${now}>=c.starts_at AND ${now}<c.ends_at
        AND p.enabled=true
        AND ${now}>=p.starts_at AND ${now}<p.ends_at
        AND NOT EXISTS (SELECT 1 FROM marketing.coupons cp WHERE cp.promotion_id=p.id)
      ORDER BY p.id`.execute(this.db);
    return result.rows;
  }

  async usage(input: { promotionId: string; customerId: string | null }): Promise<{ total: number; customer: number }> {
    const result = await sql<{ total: string; customer: string }>`
      SELECT count(*) FILTER (WHERE promotion_id=${input.promotionId}::uuid AND status IN ('reserved','consumed')) total,
             count(*) FILTER (WHERE promotion_id=${input.promotionId}::uuid AND customer_id IS NOT DISTINCT FROM ${input.customerId}::uuid AND status IN ('reserved','consumed')) customer
      FROM marketing.redemptions`.execute(this.db);
    return {
      total: Number(result.rows[0]?.total ?? 0),
      customer: input.customerId ? Number(result.rows[0]?.customer ?? 0) : 0,
    };
  }
}
