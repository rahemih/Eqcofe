import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { AdminModule } from './admin/admin.module';
import { CustomerModule } from './customer/customer.module';
import { CatalogModule } from './catalog/catalog.module';
import { PricingModule } from './pricing/pricing.module';
import { TaxModule } from './tax/tax.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProcurementModule } from './procurement/procurement.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PosModule } from './pos/pos.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { ReturnsModule } from './returns/returns.module';
import { WarrantyModule } from './warranty/warranty.module';
import { FinanceModule } from './finance/finance.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MarketingModule } from './marketing/marketing.module';
import { ContentModule } from './content/content.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SecurityModule } from './security/security.module';
import { OperationsModule } from './operations/operations.module';
import { AfterSalesIntegrationModule } from './after-sales/after-sales.module';
import { ExcelModule } from './excel/excel.module';

@Module({
  imports: [
    IdentityModule,
    AdminModule,
    CustomerModule,
    CatalogModule,
    PricingModule,
    TaxModule,
    InventoryModule,
    ProcurementModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    PosModule,
    FulfillmentModule,
    ReturnsModule,
    WarrantyModule,
    FinanceModule,
    LoyaltyModule,
    MarketingModule,
    ContentModule,
    AiModule,
    NotificationsModule,
    IntegrationsModule,
    ConfigurationModule,
    AnalyticsModule,
    SecurityModule,
    OperationsModule,
    AfterSalesIntegrationModule,
    ExcelModule
  ],
  exports: [
    IdentityModule,
    AdminModule,
    CustomerModule,
    CatalogModule,
    PricingModule,
    TaxModule,
    InventoryModule,
    ProcurementModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    PosModule,
    FulfillmentModule,
    ReturnsModule,
    WarrantyModule,
    FinanceModule,
    LoyaltyModule,
    MarketingModule,
    ContentModule,
    AiModule,
    NotificationsModule,
    IntegrationsModule,
    ConfigurationModule,
    AnalyticsModule,
    SecurityModule,
    OperationsModule,
    AfterSalesIntegrationModule,
    ExcelModule
  ],
})
export class DomainModulesModule {}
