import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OrderWarrantyItemSnapshot,OrderWarrantyPort } from './order-warranty.port';
@Injectable()
export class OrderWarrantyService implements OrderWarrantyPort{
  async getOwnedItemForWarranty(ex:DatabaseExecutor,orderItemId:string,customerId:string,lock:boolean):Promise<OrderWarrantyItemSnapshot|null>{
    const r=await sql<any>`SELECT o.id order_id,o.order_number,o.customer_id,o.status order_status,
      oi.id order_item_id,oi.quantity,oi.product_id,oi.variant_id,oi.unit_final_toman,oi.line_total_toman
      FROM orders.order_items oi JOIN orders.orders o ON o.id=oi.order_id
      WHERE oi.id=${orderItemId}::uuid AND o.customer_id=${customerId}::uuid
      ${sql.raw(lock?'FOR UPDATE OF o':'')}`.execute(ex);
    const x=r.rows[0];if(!x)return null;
    return{orderId:String(x.order_id),orderNumber:String(x.order_number),customerId:x.customer_id?String(x.customer_id):null,
      orderStatus:String(x.order_status),orderItemId:String(x.order_item_id),quantity:Number(x.quantity),
      productId:String(x.product_id),variantId:String(x.variant_id),unitFinalToman:Number(x.unit_final_toman),lineTotalToman:Number(x.line_total_toman)};
  }
}
