import { Inject,Injectable } from '@nestjs/common';
import { Kysely,sql } from 'kysely';
import { KYSELY_DB } from '../../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../../platform/database/database.types';
import { OrderPurchaseHistoryPort } from './order-purchase-history.port';

@Injectable()
export class OrderPurchaseHistoryService implements OrderPurchaseHistoryPort {
  constructor(@Inject(KYSELY_DB)private readonly db:Kysely<DatabaseSchema>){}
  async hasCompletedPurchase(customerId:string):Promise<boolean>{
    const r=await sql<any>`SELECT 1 FROM orders.orders WHERE customer_id=${customerId}::uuid AND payment_status IN ('paid','partially_refunded','refund_required','refunded') LIMIT 1`.execute(this.db);
    return !!r.rows[0];
  }
}
