import { Inject, Injectable } from '@nestjs/common';
import { INVENTORY_COST_BASIS_PORT, InventoryCostBasisPort } from '../../inventory/application/ports/inventory-public.port';
import { PricingCostBasisPort } from '../application/ports/cost-basis.port';

@Injectable()
export class InventoryPricingCostBasisAdapter implements PricingCostBasisPort {
  constructor(@Inject(INVENTORY_COST_BASIS_PORT) private readonly inventory:InventoryCostBasisPort){}
  getUnitCostToman(variantId:string){return this.inventory.getProfitGuardUnitCostToman(variantId);}
}
