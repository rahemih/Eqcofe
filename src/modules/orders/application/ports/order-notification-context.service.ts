import { Inject,Injectable } from '@nestjs/common';
import { Kysely,sql } from 'kysely';
import { KYSELY_DB } from '../../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OrderNotificationContextPort } from './order-notification-context.port';
@Injectable()
export class OrderNotificationContextService implements OrderNotificationContextPort{
 constructor(@Inject(KYSELY_DB)private readonly db:Kysely<DatabaseSchema>){}
 async byOrderId(ex:DatabaseExecutor,orderId:string){const r=await sql<any>`SELECT id,order_number,customer_id FROM orders.orders WHERE id=${orderId}::uuid LIMIT 1`.execute(ex);const o=r.rows[0];return o?{orderId:String(o.id),orderNumber:String(o.order_number),customerId:o.customer_id?String(o.customer_id):null}:null;}
}
