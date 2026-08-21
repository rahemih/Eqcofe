import { Module } from '@nestjs/common';
import { FulfillmentRepository } from './infrastructure/fulfillment.repository';
import { FulfillmentService } from './application/fulfillment.service';
import { ShipmentService } from './application/shipment.service';
import { ShippingProviderRegistry } from './application/ports/shipping-provider.registry';
import { FulfillmentController } from './presentation/fulfillment.controller';
import { IntegrationShippingProviderAdapterFactory } from './infrastructure/integration-shipping-provider.adapter';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { FULFILLMENT_AFTER_SALES_PORT } from './application/ports/fulfillment-after-sales.port';
import { FulfillmentAfterSalesService } from './application/ports/fulfillment-after-sales.service';
@Module({
  imports:[InventoryModule,OrdersModule,IntegrationsModule],
  controllers:[FulfillmentController],
  providers:[FulfillmentRepository,FulfillmentService,ShipmentService,FulfillmentAfterSalesService,IntegrationShippingProviderAdapterFactory,ShippingProviderRegistry,{provide:FULFILLMENT_AFTER_SALES_PORT,useExisting:FulfillmentAfterSalesService}],
  exports:[FulfillmentRepository,FulfillmentService,ShipmentService,ShippingProviderRegistry,FULFILLMENT_AFTER_SALES_PORT],
})
export class FulfillmentModule {}
