import { Module } from '@nestjs/common';
import { FinanceRepository } from './infrastructure/finance.repository';
import { ChartOfAccountsService } from './application/chart-of-accounts.service';
import { JournalService } from './application/journal.service';
import { CostLedgerService } from './application/cost-ledger.service';
import { ProfitCalculationService } from './application/profit-calculation.service';
import { ProfitRuleService } from './application/profit-rule.service';
import { ProfitFinalizationService } from './application/profit-finalization.service';
import { FinanceCrossDomainConsumer } from './application/finance-cross-domain.consumer';
import { FinanceController } from './presentation/finance.controller';
import { FinanceReportingService } from './application/finance-reporting.service';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports:[OrdersModule,PaymentsModule,InventoryModule],
  controllers:[FinanceController],
  providers:[FinanceRepository,ChartOfAccountsService,JournalService,CostLedgerService,ProfitCalculationService,ProfitRuleService,ProfitFinalizationService,FinanceCrossDomainConsumer,FinanceReportingService],
  exports:[ChartOfAccountsService,JournalService,CostLedgerService,ProfitCalculationService,ProfitRuleService,ProfitFinalizationService,FinanceCrossDomainConsumer,FinanceReportingService],
})
export class FinanceModule {}
