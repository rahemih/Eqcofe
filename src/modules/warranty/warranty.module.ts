import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { WarrantyRepository } from './infrastructure/warranty.repository';
import { WarrantyService } from './application/warranty.service';
import { WarrantyController } from './presentation/warranty.controller';
import { WARRANTY_CUSTOMER_READ_PORT } from './application/ports/warranty-customer-read.port';
import { WarrantyCustomerReadService } from './application/ports/warranty-customer-read.service';
@Module({imports:[OrdersModule],controllers:[WarrantyController],providers:[WarrantyRepository,WarrantyService,WarrantyCustomerReadService,{provide:WARRANTY_CUSTOMER_READ_PORT,useExisting:WarrantyCustomerReadService}],exports:[WarrantyRepository,WarrantyService,WARRANTY_CUSTOMER_READ_PORT]})
export class WarrantyModule {}
