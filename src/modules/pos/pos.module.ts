import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PhysicalSaleService } from './application/physical-sale.service';
import { PosScanResolutionService } from './application/pos-scan-resolution.service';
import { PosInventoryConsumptionService } from './application/pos-inventory-consumption.service';
import { PhysicalSaleRepository } from './infrastructure/physical-sale.repository';

@Module({
  imports: [CatalogModule, InventoryModule],
  providers: [PhysicalSaleRepository, PhysicalSaleService, PosScanResolutionService, PosInventoryConsumptionService],
  exports: [PhysicalSaleService, PosScanResolutionService, PosInventoryConsumptionService],
})
export class PosModule {}
