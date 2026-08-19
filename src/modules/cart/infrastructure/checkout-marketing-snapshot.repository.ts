import { Inject,Injectable } from '@nestjs/common';
import { Kysely,sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';

@Injectable()
export class CheckoutMarketingSnapshotRepository {
  constructor(@Inject(KYSELY_DB)private readonly db:Kysely<DatabaseSchema>){}
  async apply(ex:DatabaseExecutor,input:{checkoutId:string;pricingDiscountToman:number;marketingDiscountToman:number;marketingSnapshot:unknown;totalToman:number}){
    const discount=input.pricingDiscountToman+input.marketingDiscountToman;
    await sql`UPDATE cart.checkouts SET discount_toman=${discount},marketing_discount_toman=${input.marketingDiscountToman},marketing_snapshot=${JSON.stringify(input.marketingSnapshot)}::jsonb,total_toman=${input.totalToman},updated_at=now() WHERE id=${input.checkoutId}::uuid AND status='quoted'`.execute(ex);
  }
}
