import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PhysicalSaleService } from './application/physical-sale.service';
import { PosScanResolutionService } from './application/pos-scan-resolution.service';
import { PhysicalSaleRepository } from './infrastructure/physical-sale.repository';

@Module({
  imports: [CatalogModule],
  providers: [PhysicalSaleRepository, PhysicalSaleService, PosScanResolutionService],
  exports: [PhysicalSaleService, PosScanResolutionService],
})
export class PosModule {}
