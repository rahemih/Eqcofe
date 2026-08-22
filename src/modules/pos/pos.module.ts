import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PricingModule } from '../pricing/pricing.module';
import { PaymentsModule } from '../payments/payments.module';
import { PhysicalSaleService } from './application/physical-sale.service';
import { PhysicalSaleCommitService } from './application/physical-sale-commit.service';
import { PosScanResolutionService } from './application/pos-scan-resolution.service';
import { PosInventoryConsumptionService } from './application/pos-inventory-consumption.service';
import { PosPricingSnapshotService } from './application/pos-pricing-snapshot.service';
import { PhysicalSaleRepository } from './infrastructure/physical-sale.repository';

@Module({
  imports: [CatalogModule, InventoryModule, PricingModule, PaymentsModule],
  providers: [PhysicalSaleRepository, PhysicalSaleService, PhysicalSaleCommitService, PosScanResolutionService, PosInventoryConsumptionService, PosPricingSnapshotService],
  exports: [PhysicalSaleService, PhysicalSaleCommitService, PosScanResolutionService, PosInventoryConsumptionService, PosPricingSnapshotService],
})
export class PosModule {}
