import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OrderFulfillmentPort,OrderFulfillmentSnapshot } from './order-fulfillment.port';

@Injectable()
export class OrderFulfillmentService implements OrderFulfillmentPort {
 async getForFulfillment(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<OrderFulfillmentSnapshot|null>{const r=await sql<any>`SELECT id,status,payment_status,settlement_payment_id,reservation_id FROM orders.orders WHERE id=${orderId}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);const o=r.rows[0];if(!o)return null;const items=await sql<any>`SELECT id,variant_id,quantity FROM orders.order_items WHERE order_id=${orderId}::uuid ORDER BY id`.execute(ex);return{id:String(o.id),status:String(o.status),paymentStatus:String(o.payment_status),settlementPaymentId:o.settlement_payment_id?String(o.settlement_payment_id):null,reservationId:o.reservation_id?String(o.reservation_id):null,items:items.rows.map((x:any)=>({id:String(x.id),variantId:String(x.variant_id),quantity:Number(x.quantity)}))};}
}
