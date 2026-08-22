import { Injectable } from '@nestjs/common';
import { InventoryPosService, PhysicalSaleInventoryConsumptionInput } from '../../inventory/application/inventory-pos.service';

@Injectable()
export class PosInventoryConsumptionService {
  constructor(private readonly inventory: InventoryPosService) {}

  consume(input: PhysicalSaleInventoryConsumptionInput) {
    return this.inventory.consumePhysicalSale(input);
  }
}
