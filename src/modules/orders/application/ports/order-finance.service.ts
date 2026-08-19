import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { OrderFinancePort,OrderFinanceSnapshot,OrderFinanceRuleItem } from './order-finance.port';

@Injectable()
export class OrderFinanceService implements OrderFinancePort{
  async snapshot(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<OrderFinanceSnapshot|null>{
    const r=await sql<any>`SELECT id,order_number,status,subtotal_toman,discount_toman,shipping_toman,tax_toman,total_toman,created_at
      FROM orders.orders WHERE id=${orderId}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    const x=r.rows[0];if(!x)return null;
    const subtotal=Number(x.subtotal_toman),discount=Number(x.discount_toman);
    return{orderId:String(x.id),orderNumber:String(x.order_number),status:String(x.status),subtotalToman:subtotal,discountToman:discount,
      merchandiseRevenueToman:subtotal-discount,shippingToman:Number(x.shipping_toman),taxToman:Number(x.tax_toman),totalToman:Number(x.total_toman),createdAt:new Date(x.created_at)};
  }

  async ruleContext(ex:DatabaseExecutor,orderId:string):Promise<OrderFinanceRuleItem[]>{
    const r=await sql<any>`SELECT oi.id order_item_id,p.id product_id,p.brand_id,
      array_agg(DISTINCT c.category_id) FILTER(WHERE c.category_id IS NOT NULL) category_ids
      FROM orders.order_items oi
      JOIN catalog.products p ON p.id=oi.product_id
      LEFT JOIN (
        SELECT product_id,category_id FROM catalog.product_categories
        UNION
        SELECT id product_id,primary_category_id category_id FROM catalog.products
      ) c ON c.product_id=p.id
      WHERE oi.order_id=${orderId}::uuid
      GROUP BY oi.id,p.id,p.brand_id
      ORDER BY oi.id`.execute(ex);
    return r.rows.map(x=>({
      orderItemId:String(x.order_item_id),
      productId:String(x.product_id),
      brandId:x.brand_id?String(x.brand_id):null,
      categoryIds:Array.isArray(x.category_ids)?x.category_ids.map(String):[],
    }));
  }
}
