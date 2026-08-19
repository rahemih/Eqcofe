import { Global,Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { OrdersModule } from '../orders/orders.module';
import { AfterSalesIntegrationService } from './application/after-sales-integration.service';

@Global()
@Module({
  imports:[PaymentsModule,InventoryModule,FulfillmentModule,OrdersModule],
  providers:[AfterSalesIntegrationService],
  exports:[AfterSalesIntegrationService],
})
export class AfterSalesIntegrationModule{}
