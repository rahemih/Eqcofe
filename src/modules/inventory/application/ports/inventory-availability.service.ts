import { Injectable } from '@nestjs/common';
import { InventoryRepository } from '../../infrastructure/inventory.repository';
import { onlineSellable } from '../../domain/inventory.math';
import type { InventoryAvailabilityPort } from './inventory-public.port';
@Injectable() export class InventoryAvailabilityService implements InventoryAvailabilityPort {
  constructor(private readonly repo:InventoryRepository){}
  async getOnlineSellableQuantity(variantId:string){const rows=await this.repo.listBalances(variantId);return rows.reduce((sum:any,b:any)=>sum+onlineSellable({onHand:Number(b.on_hand),reserved:Number(b.reserved),allocated:Number(b.allocated),damaged:Number(b.damaged),quarantine:Number(b.quarantine),protectionPercent:Number(b.physical_protection_percent)}),0);}
  getUnitCostToman(variantId:string){return this.repo.currentWeightedCost(variantId);}
  async planOnlineReservation(items:{variant_id:string;quantity:number}[]){const out:{warehouse_id:string;variant_id:string;quantity:number}[]=[];for(const item of items){let remaining=item.quantity;const rows=await this.repo.listBalances(item.variant_id);for(const b of rows){const available=onlineSellable({onHand:Number(b.on_hand),reserved:Number(b.reserved),allocated:Number(b.allocated),damaged:Number(b.damaged),quarantine:Number(b.quarantine),protectionPercent:Number(b.physical_protection_percent)});const take=Math.min(remaining,available);if(take>0){out.push({warehouse_id:String(b.warehouse_id),variant_id:item.variant_id,quantity:take});remaining-=take;}if(remaining===0)break;}if(remaining>0)throw new Error('INSUFFICIENT_ONLINE_STOCK');}return out;}
}
