import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { DomainError } from '../../../../shared/errors/domain-error';
import { InventoryFinanceCogsSnapshot,InventoryFinancePort } from './inventory-finance.port';
@Injectable()
export class InventoryFinanceService implements InventoryFinancePort{
  async cogsForOrder(ex:DatabaseExecutor,orderId:string,lock:boolean):Promise<InventoryFinanceCogsSnapshot>{
    if(lock)await sql`SELECT c.id FROM inventory.cost_layer_consumptions c JOIN orders.order_items oi ON oi.id=c.order_item_id
      WHERE oi.order_id=${orderId}::uuid ORDER BY c.id FOR SHARE OF c`.execute(ex);
    const g=(await sql<any>`SELECT COALESCE(sum(c.quantity*c.unit_cost_toman),0)::bigint amount,count(*)::int cnt
      FROM inventory.cost_layer_consumptions c JOIN orders.order_items oi ON oi.id=c.order_item_id
      WHERE oi.order_id=${orderId}::uuid`.execute(ex)).rows[0];
    const r=(await sql<any>`SELECT COALESCE(sum(cl.received_quantity*cl.effective_unit_cost_toman),0)::bigint amount,count(*)::int cnt
      FROM inventory.cost_layers cl JOIN inventory.cost_layer_consumptions c ON c.id=cl.return_parent_consumption_id
      JOIN orders.order_items oi ON oi.id=c.order_item_id WHERE oi.order_id=${orderId}::uuid`.execute(ex)).rows[0];
    const gross=Number(g?.amount??0),returned=Number(r?.amount??0);
    if(returned>gross)throw new DomainError('FINANCE_RETURNED_COGS_EXCEEDS_GROSS','بهای برگشتی از بهای مصرف‌شده بیشتر است.');
    return{grossCogsToman:gross,returnedCogsToman:returned,netCogsToman:gross-returned,consumptionCount:Number(g?.cnt??0),returnLayerCount:Number(r?.cnt??0)};
  }
}
