import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OrderAfterSalesItem,OrderAfterSalesPort } from './order-after-sales.port';
@Injectable()
export class OrderAfterSalesService implements OrderAfterSalesPort{
  async item(ex:DatabaseExecutor,orderId:string,orderItemId:string,lock:boolean):Promise<OrderAfterSalesItem|null>{
    const r=await sql<any>`SELECT o.id order_id,o.order_number,o.customer_id,oi.id order_item_id,oi.variant_id,oi.product_id,
      oi.quantity,oi.unit_final_toman,oi.line_total_toman
      FROM orders.orders o JOIN orders.order_items oi ON oi.order_id=o.id
      WHERE o.id=${orderId}::uuid AND oi.id=${orderItemId}::uuid
      ${sql.raw(lock?'FOR UPDATE OF o,oi':'')}`.execute(ex);
    const x=r.rows[0];if(!x)return null;
    return{orderId:String(x.order_id),orderNumber:String(x.order_number),customerId:x.customer_id?String(x.customer_id):null,
      orderItemId:String(x.order_item_id),variantId:String(x.variant_id),productId:String(x.product_id),
      orderedQuantity:Number(x.quantity),unitFinalToman:Number(x.unit_final_toman),lineTotalToman:Number(x.line_total_toman)};
  }
}
