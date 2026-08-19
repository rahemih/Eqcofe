import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { DeliveredAfterSalesSnapshot,FulfillmentAfterSalesPort } from './fulfillment-after-sales.port';
@Injectable()
export class FulfillmentAfterSalesService implements FulfillmentAfterSalesPort{
  async deliveredItem(ex:DatabaseExecutor,orderId:string,orderItemId:string,lock:boolean):Promise<DeliveredAfterSalesSnapshot>{
    if(lock)await sql`SELECT s.id FROM fulfillment.shipments s JOIN fulfillment.shipment_items si ON si.shipment_id=s.id WHERE s.order_id=${orderId}::uuid AND si.order_item_id=${orderItemId}::uuid AND s.status='delivered' ORDER BY s.id FOR UPDATE OF s`.execute(ex);
    const x=(await sql<any>`SELECT COALESCE(sum(si.quantity),0)::int delivered_quantity,max(s.delivered_at) last_delivered_at,COALESCE(array_agg(DISTINCT s.warehouse_id) FILTER(WHERE s.warehouse_id IS NOT NULL),'{}'::uuid[]) warehouses FROM fulfillment.shipment_items si JOIN fulfillment.shipments s ON s.id=si.shipment_id WHERE s.order_id=${orderId}::uuid AND si.order_item_id=${orderItemId}::uuid AND s.status='delivered'`.execute(ex)).rows[0];
    return{orderId,orderItemId,deliveredQuantity:Number(x?.delivered_quantity??0),lastDeliveredAt:x?.last_delivered_at?new Date(x.last_delivered_at):null,sourceWarehouses:Array.isArray(x?.warehouses)?x.warehouses.map(String):[]};
  }
}
