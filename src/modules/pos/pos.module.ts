import { Module } from '@nestjs/common';
import { PhysicalSaleService } from './application/physical-sale.service';
import { PhysicalSaleRepository } from './infrastructure/physical-sale.repository';

@Module({
  providers: [PhysicalSaleRepository, PhysicalSaleService],
  exports: [PhysicalSaleService],
})
export class PosModule {}
