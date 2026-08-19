import type { DatabaseExecutor } from '../../../../platform/database/transaction-manager';

export const INVENTORY_PROCUREMENT_PORT = Symbol('INVENTORY_PROCUREMENT_PORT');

export interface ReceiptStockItem {
  goods_receipt_item_id: string;
  variant_id: string;
  accepted_quantity: number;
  quarantine_quantity: number;
  unit_cost_toman: number;
}

export interface InventoryProcurementPort {
  receiveGoods(executor: DatabaseExecutor, input: {
    warehouse_id: string;
    goods_receipt_id: string;
    items: ReceiptStockItem[];
    actor_id?: string;
  }): Promise<void>;
  reverseGoodsReceipt(executor: DatabaseExecutor, input: {
    goods_receipt_id: string;
    warehouse_id: string;
    items: Array<{goods_receipt_item_id:string;variant_id:string;accepted_quantity:number;quarantine_quantity:number}>;
    actor_id?: string;
  }): Promise<void>;
  revalueReceiptItem(executor: DatabaseExecutor, input: {
    goods_receipt_item_id: string;
    additional_total_toman: number;
    source_landed_cost_id: string;
  }): Promise<{inventory_revaluation_toman:number;consumed_cogs_revaluation_toman:number}>;
  returnToSupplier(executor: DatabaseExecutor, input: {
    purchase_return_id:string; warehouse_id:string; actor_id?:string;
    items:Array<{variant_id:string;quantity:number;stock_bucket:'sellable'|'quarantine'|'damaged'}>;
  }): Promise<{total_cost_toman:number}>;
}
