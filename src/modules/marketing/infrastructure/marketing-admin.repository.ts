import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';

@Injectable()
export class MarketingAdminRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async listPromotions(campaignId?:string){
    const q=campaignId
      ? sql<any>`SELECT * FROM marketing.promotions WHERE campaign_id=${campaignId}::uuid ORDER BY created_at DESC,id DESC LIMIT 200`
      : sql<any>`SELECT * FROM marketing.promotions ORDER BY created_at DESC,id DESC LIMIT 200`;
    return (await q.execute(this.db)).rows;
  }

  async promotionById(id:string,ex:DatabaseExecutor=this.db,lock=false){
    const q=lock?sql<any>`SELECT * FROM marketing.promotions WHERE id=${id}::uuid FOR UPDATE`:sql<any>`SELECT * FROM marketing.promotions WHERE id=${id}::uuid`;
    return (await q.execute(ex)).rows[0]??null;
  }

  async createPromotion(ex:DatabaseExecutor,input:any){
    const r=await sql<any>`INSERT INTO marketing.promotions(id,campaign_id,name,kind,value,max_discount_toman,min_subtotal_toman,first_purchase_only,wholesale_allowed,total_usage_limit,per_customer_usage_limit,stacking,starts_at,ends_at,enabled)
      VALUES(${input.id}::uuid,${input.campaignId}::uuid,${input.name},${input.kind},${input.value},${input.maxDiscountToman},${input.minSubtotalToman},${input.firstPurchaseOnly},${input.wholesaleAllowed},${input.totalUsageLimit},${input.perCustomerUsageLimit},${input.stacking},${input.startsAt},${input.endsAt},true) RETURNING *`.execute(ex);
    return r.rows[0];
  }

  async setPromotionEnabled(ex:DatabaseExecutor,id:string,expectedVersion:number,enabled:boolean){
    const r=await sql<any>`UPDATE marketing.promotions SET enabled=${enabled},version=version+1,updated_at=now() WHERE id=${id}::uuid AND version=${expectedVersion} RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async listCoupons(promotionId?:string){
    const q=promotionId
      ? sql<any>`SELECT * FROM marketing.coupons WHERE promotion_id=${promotionId}::uuid ORDER BY created_at DESC,id DESC LIMIT 200`
      : sql<any>`SELECT * FROM marketing.coupons ORDER BY created_at DESC,id DESC LIMIT 200`;
    return (await q.execute(this.db)).rows;
  }

  async couponById(id:string,ex:DatabaseExecutor=this.db,lock=false){
    const q=lock?sql<any>`SELECT * FROM marketing.coupons WHERE id=${id}::uuid FOR UPDATE`:sql<any>`SELECT * FROM marketing.coupons WHERE id=${id}::uuid`;
    return (await q.execute(ex)).rows[0]??null;
  }

  async createCoupon(ex:DatabaseExecutor,input:any){
    const r=await sql<any>`INSERT INTO marketing.coupons(id,promotion_id,code,enabled,starts_at,ends_at,total_usage_limit,per_customer_usage_limit)
      VALUES(${input.id}::uuid,${input.promotionId}::uuid,${input.code},true,${input.startsAt},${input.endsAt},${input.totalUsageLimit},${input.perCustomerUsageLimit}) RETURNING *`.execute(ex);
    return r.rows[0];
  }

  async setCouponEnabled(ex:DatabaseExecutor,id:string,expectedVersion:number,enabled:boolean){
    const r=await sql<any>`UPDATE marketing.coupons SET enabled=${enabled},version=version+1,updated_at=now() WHERE id=${id}::uuid AND version=${expectedVersion} RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async listRedemptions(status?:string){
    const q=status
      ? sql<any>`SELECT * FROM marketing.redemptions WHERE status=${status} ORDER BY created_at DESC,id DESC LIMIT 200`
      : sql<any>`SELECT * FROM marketing.redemptions ORDER BY created_at DESC,id DESC LIMIT 200`;
    return (await q.execute(this.db)).rows;
  }
}
