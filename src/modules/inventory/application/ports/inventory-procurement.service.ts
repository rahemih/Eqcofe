import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
import { DomainError } from '../../../../shared/errors/domain-error';
import { InventoryRepository } from '../../infrastructure/inventory.repository';
import type { InventoryProcurementPort, ReceiptStockItem } from './inventory-procurement.port';

@Injectable()
export class InventoryProcurementService implements InventoryProcurementPort {
  constructor(private readonly repo: InventoryRepository) {}

  async receiveGoods(ex:DatabaseExecutor,input:{warehouse_id:string;goods_receipt_id:string;items:ReceiptStockItem[];actor_id?:string}):Promise<void>{
    for(const item of input.items){
      const total=item.accepted_quantity+item.quarantine_quantity;
      if(total<=0) continue;
      await this.repo.lockBalance(ex,input.warehouse_id,item.variant_id);
      await this.repo.updateBalance(ex,input.warehouse_id,item.variant_id,{onHand:total,quarantine:item.quarantine_quantity});
      if(item.accepted_quantity>0){
        const layerId=randomUUID();
        await this.repo.createCostLayer(ex,{id:layerId,warehouseId:input.warehouse_id,variantId:item.variant_id,goodsReceiptItemId:item.goods_receipt_item_id,stockBucket:'sellable',quantity:item.accepted_quantity,baseUnitCostToman:item.unit_cost_toman,receivedAt:new Date()});
        await this.repo.movement(ex,{id:randomUUID(),warehouseId:input.warehouse_id,variantId:item.variant_id,type:'goods_receipt',quantityDelta:item.accepted_quantity,bucketTo:'sellable',costLayerId:layerId,reasonCode:'goods_receipt',createdBy:input.actor_id});
      }
      if(item.quarantine_quantity>0){
        const layerId=randomUUID();
        await this.repo.createCostLayer(ex,{id:layerId,warehouseId:input.warehouse_id,variantId:item.variant_id,goodsReceiptItemId:item.goods_receipt_item_id,stockBucket:'quarantine',quantity:item.quarantine_quantity,baseUnitCostToman:item.unit_cost_toman,receivedAt:new Date()});
        await this.repo.movement(ex,{id:randomUUID(),warehouseId:input.warehouse_id,variantId:item.variant_id,type:'goods_receipt_quarantine',quantityDelta:item.quarantine_quantity,bucketTo:'quarantine',costLayerId:layerId,reasonCode:'goods_receipt',createdBy:input.actor_id});
      }
    }
  }

  async reverseGoodsReceipt(ex:DatabaseExecutor,input:{goods_receipt_id:string;warehouse_id:string;items:Array<{goods_receipt_item_id:string;variant_id:string;accepted_quantity:number;quarantine_quantity:number}>;actor_id?:string}):Promise<void>{
    for(const item of input.items){
      const layers=await this.repo.receiptItemLayersForUpdate(ex,item.goods_receipt_item_id);
      if(layers.length===0 && item.accepted_quantity+item.quarantine_quantity>0) throw new DomainError('RECEIPT_COST_LAYER_MISSING','لایه هزینه رسید کالا پیدا نشد.');
      for(const layer of layers){
        if(Number(layer.remaining_quantity)!==Number(layer.received_quantity)) throw new DomainError('GOODS_RECEIPT_ALREADY_CONSUMED','بخشی از موجودی این رسید مصرف شده و برگشت مستقیم مجاز نیست.');
        if(Number(layer.landed_unit_cost_toman)!==Number(layer.base_unit_cost_toman)) throw new DomainError('LANDED_COST_ALREADY_FINALIZED','برای این رسید هزینه جانبی نهایی شده و برگشت مستقیم مجاز نیست.');
      }
      const sellable=layers.filter((x:Record<string,unknown>)=>String(x.stock_bucket)==='sellable').reduce((s:number,x:Record<string,unknown>)=>s+Number(x.remaining_quantity),0);
      const quarantine=layers.filter((x:Record<string,unknown>)=>String(x.stock_bucket)==='quarantine').reduce((s:number,x:Record<string,unknown>)=>s+Number(x.remaining_quantity),0);
      const bal=await this.repo.lockBalance(ex,input.warehouse_id,item.variant_id);
      if(!bal) throw new DomainError('WAREHOUSE_NOT_FOUND','انبار پیدا نشد.');
      const freeSellable=Number(bal.on_hand)-Number(bal.reserved)-Number(bal.allocated)-Number(bal.damaged)-Number(bal.quarantine);
      if(freeSellable<sellable || Number(bal.quarantine)<quarantine) throw new DomainError('GOODS_RECEIPT_STOCK_ENCUMBERED','موجودی این رسید رزرو/تخصیص یافته و برگشت مستقیم مجاز نیست.');
      for(const layer of layers){
        const q=Number(layer.remaining_quantity); if(q<=0) continue;
        await this.repo.consumeLayer(ex,String(layer.id),q);
        await this.repo.movement(ex,{id:randomUUID(),warehouseId:input.warehouse_id,variantId:item.variant_id,type:'goods_receipt_reversal',quantityDelta:-q,bucketFrom:String(layer.stock_bucket),costLayerId:String(layer.id),reasonCode:'goods_receipt_reversal',createdBy:input.actor_id});
      }
      await this.repo.updateBalance(ex,input.warehouse_id,item.variant_id,{onHand:-(sellable+quarantine),quarantine:-quarantine});
    }
  }

  async revalueReceiptItem(ex:DatabaseExecutor,input:{goods_receipt_item_id:string;additional_total_toman:number;source_landed_cost_id:string}):Promise<{inventory_revaluation_toman:number;consumed_cogs_revaluation_toman:number}>{
    if(!Number.isSafeInteger(input.additional_total_toman)||input.additional_total_toman<0) throw new DomainError('INVALID_MONEY','هزینه تخصیص‌یافته نامعتبر است.');
    const layers=await this.repo.receiptItemLayersForUpdate(ex,input.goods_receipt_item_id);
    const totalQty=layers.reduce((s:number,x:Record<string,unknown>)=>s+Number(x.received_quantity),0);
    if(totalQty<=0) throw new DomainError('RECEIPT_COST_LAYER_MISSING','لایه هزینه رسید کالا پیدا نشد.');
    let remainingAmount=input.additional_total_toman;
    let inventoryRevaluation=0, consumedRevaluation=0;
    for(let i=0;i<layers.length;i++){
      const layer=layers[i]; const qty=Number(layer.received_quantity);
      const share=i===layers.length-1?remainingAmount:Math.floor(input.additional_total_toman*qty/totalQty); remainingAmount-=share;
      const perUnit=Math.floor(share/qty); const remainder=share-(perUnit*qty);
      const oldEffective=Number(layer.effective_unit_cost_toman); const newEffective=oldEffective+perUnit;
      await this.repo.revalueCostLayer(ex,String(layer.id),newEffective,Number(layer.landed_unit_cost_toman)+perUnit);
      const rem=Number(layer.remaining_quantity), consumed=qty-rem;
      inventoryRevaluation+=perUnit*rem;
      consumedRevaluation+=perUnit*consumed;
      if(remainder>0){
        // Rounding remainder is recorded as consumed/inventory revaluation without distorting unit cost.
        if(rem>0) inventoryRevaluation+=remainder; else consumedRevaluation+=remainder;
      }
    }
    await this.repo.insertCostRevaluation(ex,{id:randomUUID(),goodsReceiptItemId:input.goods_receipt_item_id,sourceLandedCostId:input.source_landed_cost_id,amountToman:input.additional_total_toman,inventoryAmountToman:inventoryRevaluation,consumedCogsAmountToman:consumedRevaluation});
    return {inventory_revaluation_toman:inventoryRevaluation,consumed_cogs_revaluation_toman:consumedRevaluation};
  }
  async returnToSupplier(ex:DatabaseExecutor,input:{purchase_return_id:string;warehouse_id:string;actor_id?:string;items:Array<{variant_id:string;quantity:number;stock_bucket:'sellable'|'quarantine'|'damaged'}>}):Promise<{total_cost_toman:number}>{
    let totalCost=0;
    for(const item of input.items){
      if(!Number.isSafeInteger(item.quantity)||item.quantity<=0)throw new DomainError('INVALID_QUANTITY','مقدار مرجوعی به تامین‌کننده نامعتبر است.');
      const bal=await this.repo.lockBalance(ex,input.warehouse_id,item.variant_id);if(!bal)throw new DomainError('WAREHOUSE_NOT_FOUND','انبار پیدا نشد.');
      if(item.stock_bucket==='sellable'){
        const free=Number(bal.on_hand)-Number(bal.reserved)-Number(bal.allocated)-Number(bal.damaged)-Number(bal.quarantine);
        if(free<item.quantity)throw new DomainError('INSUFFICIENT_STOCK','موجودی آزاد برای مرجوعی کافی نیست.');
      } else if(Number(bal[item.stock_bucket])<item.quantity) throw new DomainError('INSUFFICIENT_STOCK','موجودی وضعیت انتخاب‌شده برای مرجوعی کافی نیست.');
      const layers=await this.repo.fifoLayers(ex,input.warehouse_id,item.variant_id,item.stock_bucket);let left=item.quantity;
      for(const layer of layers){if(left<=0)break;const q=Math.min(left,Number(layer.remaining_quantity));if(q<=0)continue;await this.repo.consumeLayer(ex,String(layer.id),q);totalCost+=q*Number(layer.effective_unit_cost_toman);await this.repo.movement(ex,{id:randomUUID(),warehouseId:input.warehouse_id,variantId:item.variant_id,type:'supplier_return',quantityDelta:-q,bucketFrom:item.stock_bucket,costLayerId:String(layer.id),reasonCode:'supplier_return',createdBy:input.actor_id});left-=q;}
      if(left>0)throw new DomainError('COST_LAYER_CONFLICT','لایه هزینه کافی برای مرجوعی وجود ندارد.');
      const patch:Record<string,number>={onHand:-item.quantity};if(item.stock_bucket==='quarantine')patch.quarantine=-item.quantity;if(item.stock_bucket==='damaged')patch.damaged=-item.quantity;await this.repo.updateBalance(ex,input.warehouse_id,item.variant_id,patch);
    }
    return {total_cost_toman:totalCost};
  }

}
