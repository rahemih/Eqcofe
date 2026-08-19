import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ReturnsRepository } from './infrastructure/returns.repository';
import { ReturnsService } from './application/returns.service';
import { ReturnsController } from './presentation/returns.controller';
import { RETURN_CUSTOMER_READ_PORT } from './application/ports/return-customer-read.port';
import { ReturnCustomerReadService } from './application/ports/return-customer-read.service';

@Module({
  imports:[OrdersModule],
  controllers:[ReturnsController],
  providers:[ReturnsRepository,ReturnsService,ReturnCustomerReadService,{provide:RETURN_CUSTOMER_READ_PORT,useExisting:ReturnCustomerReadService}],
  exports:[ReturnsRepository,ReturnsService,RETURN_CUSTOMER_READ_PORT],
})
export class ReturnsModule {}
