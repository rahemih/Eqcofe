import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PricingModule } from '../pricing/pricing.module';
import { PaymentsModule } from '../payments/payments.module';
import { PhysicalSaleService } from './application/physical-sale.service';
import { PhysicalSaleCommitService } from './application/physical-sale-commit.service';
import { OfflineCommandSyncService } from './application/offline-command-sync.service';
import { OfflineReconciliationService } from './application/offline-reconciliation.service';
import { PosScanResolutionService } from './application/pos-scan-resolution.service';
import { PosInventoryConsumptionService } from './application/pos-inventory-consumption.service';
import { PosPricingSnapshotService } from './application/pos-pricing-snapshot.service';
import { PhysicalSaleRepository } from './infrastructure/physical-sale.repository';
import { OfflineCommandRepository } from './infrastructure/offline-command.repository';

@Module({
  imports: [CatalogModule, InventoryModule, PricingModule, PaymentsModule],
  providers: [PhysicalSaleRepository, OfflineCommandRepository, PhysicalSaleService, PhysicalSaleCommitService, OfflineCommandSyncService, OfflineReconciliationService, PosScanResolutionService, PosInventoryConsumptionService, PosPricingSnapshotService],
  exports: [PhysicalSaleService, PhysicalSaleCommitService, OfflineCommandSyncService, OfflineReconciliationService, PosScanResolutionService, PosInventoryConsumptionService, PosPricingSnapshotService],
})
export class PosModule {}
