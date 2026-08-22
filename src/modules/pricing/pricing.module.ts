import { Module } from '@nestjs/common';
import { PricingController } from './presentation/pricing.controller';
import { PricingRepository } from './infrastructure/pricing.repository';
import { PricingQueryService } from './application/pricing-query.service';
import { BasePriceService } from './application/base-price.service';
import { PriceRuleService } from './application/price-rule.service';
import { BulkPricingService } from './application/bulk-pricing.service';
import { CurrencyPricingService } from './application/currency-pricing.service';
import { ProfitGuardService } from './application/profit-guard.service';
import { CurrencyImpactService } from './application/currency-impact.service';
import { CurrencyRuleService } from './application/currency-rule.service';
import { FxCurrencyPreviewService } from './application/fx-currency-preview.service';
import { PricingImportApplyService } from './application/pricing-import-apply.service';
import { PRICING_PUBLIC_PORT } from './application/ports/pricing-public.port';
import { PRICING_QUOTE_PORT } from './application/ports/pricing-quote.port';
import { PRICING_COST_BASIS } from './application/ports/cost-basis.port';
import { InventoryModule } from '../inventory/inventory.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { InventoryPricingCostBasisAdapter } from './infrastructure/inventory-cost-basis.adapter';
@Module({
  imports:[InventoryModule,ConfigurationModule,IntegrationsModule],controllers:[PricingController],
  providers:[PricingRepository,PricingQueryService,BasePriceService,PriceRuleService,BulkPricingService,CurrencyPricingService,CurrencyImpactService,CurrencyRuleService,FxCurrencyPreviewService,PricingImportApplyService,ProfitGuardService,InventoryPricingCostBasisAdapter,{provide:PRICING_PUBLIC_PORT,useExisting:PricingQueryService},{provide:PRICING_QUOTE_PORT,useExisting:PricingQueryService},{provide:PRICING_COST_BASIS,useExisting:InventoryPricingCostBasisAdapter}],
  exports:[PricingQueryService,PricingImportApplyService,PRICING_PUBLIC_PORT,PRICING_QUOTE_PORT],
}) export class PricingModule{}
