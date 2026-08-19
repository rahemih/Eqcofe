import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OrderReturnsPort,OrderReturnsSnapshot } from './order-returns.port';

@Injectable()
export class OrderReturnsService implements OrderReturnsPort{
  async getOwnedForReturn(ex:DatabaseExecutor,orderNumber:string,customerId:string,lock:boolean):Promise<OrderReturnsSnapshot|null>{
    const r=await sql<any>`SELECT id,order_number,customer_id,status FROM orders.orders
      WHERE order_number=${orderNumber} AND customer_id=${customerId}::uuid
      ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    const o=r.rows[0];if(!o)return null;
    const items=await sql<any>`SELECT id,quantity,variant_id,product_id,unit_final_toman,line_total_toman FROM orders.order_items WHERE order_id=${o.id}::uuid ORDER BY id`.execute(ex);
    return{id:String(o.id),orderNumber:String(o.order_number),customerId:o.customer_id?String(o.customer_id):null,status:String(o.status),
      items:items.rows.map((x:any)=>({id:String(x.id),quantity:Number(x.quantity),variantId:String(x.variant_id),productId:String(x.product_id),unitFinalToman:Number(x.unit_final_toman),lineTotalToman:Number(x.line_total_toman)}))};
  }
}
