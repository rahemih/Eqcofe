import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PricingModule } from '../pricing/pricing.module';
import { PhysicalSaleService } from './application/physical-sale.service';
import { PosScanResolutionService } from './application/pos-scan-resolution.service';
import { PosInventoryConsumptionService } from './application/pos-inventory-consumption.service';
import { PosPricingSnapshotService } from './application/pos-pricing-snapshot.service';
import { PhysicalSaleRepository } from './infrastructure/physical-sale.repository';

@Module({
  imports: [CatalogModule, InventoryModule, PricingModule],
  providers: [PhysicalSaleRepository, PhysicalSaleService, PosScanResolutionService, PosInventoryConsumptionService, PosPricingSnapshotService],
  exports: [PhysicalSaleService, PosScanResolutionService, PosInventoryConsumptionService, PosPricingSnapshotService],
})
export class PosModule {}
