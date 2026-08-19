import { Injectable } from '@nestjs/common';
import { InventoryCostBasisPort } from './inventory-public.port';
import { InventoryRepository } from '../../infrastructure/inventory.repository';
@Injectable() export class InventoryCostBasisService implements InventoryCostBasisPort {
  constructor(private readonly repo:InventoryRepository){}
  getProfitGuardUnitCostToman(variantId:string){return this.repo.currentProfitGuardCost(variantId);}
}
