import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions, RequireIdempotency, RequireStepUp, StaffOnly } from '../../../platform/auth/auth.decorators';
import { DomainError } from '../../../shared/errors/domain-error';
import { ChartOfAccountsService } from '../application/chart-of-accounts.service';
import { JournalService } from '../application/journal.service';
import { CostLedgerService } from '../application/cost-ledger.service';
import { ProfitCalculationService } from '../application/profit-calculation.service';
import { ProfitFinalizationService } from '../application/profit-finalization.service';
import { ProfitRuleService } from '../application/profit-rule.service';
import { FinanceRepository } from '../infrastructure/finance.repository';
import { FinanceReportingService } from '../application/finance-reporting.service';

function uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
function reason(body:any){const x=String(body?.reason??body?.reason_code??body?.comment??'').trim();if(!x||x.length>2000)throw new DomainError('VALIDATION_ERROR','دلیل عملیات مالی الزامی و باید حداکثر ۲۰۰۰ نویسه باشد.');return x;}
function limit(v:unknown,def=200,max=500){const n=Number(v);return Number.isInteger(n)&&n>0?Math.min(n,max):def;}

@Controller()
export class FinanceController{
  constructor(
    private readonly accounts:ChartOfAccountsService,
    private readonly journals:JournalService,
    private readonly costs:CostLedgerService,
    private readonly profits:ProfitCalculationService,
    private readonly finalization:ProfitFinalizationService,
    private readonly rules:ProfitRuleService,
    private readonly repo:FinanceRepository,
    private readonly reporting:FinanceReportingService,
  ){}

  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/dashboard')
  dashboard(){return this.repo.dashboard();}
  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/profit')
  profitSummary(){return this.repo.profitSummary();}

  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/accounts')
  listAccounts(){return this.accounts.list();}
  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/accounts/:id')
  getAccount(@Param('id')id:string){return this.accounts.get(uuid(id));}
  @StaffOnly() @Permissions('finance.accounts.manage') @RequireIdempotency('finance.account.create') @Post('admin/finance/accounts')
  createAccount(@Body()b:any){return this.accounts.create(b);}
  @StaffOnly() @Permissions('finance.accounts.manage') @RequireIdempotency('finance.account.update') @Patch('admin/finance/accounts/:id')
  updateAccount(@Param('id')id:string,@Body()b:any){return this.accounts.update(uuid(id),b);}
  @StaffOnly() @Permissions('finance.accounts.manage') @RequireStepUp() @RequireIdempotency('finance.account.deactivate') @HttpCode(HttpStatus.OK) @Post('admin/finance/accounts/:id/deactivate')
  deactivateAccount(@Param('id')id:string){return this.accounts.update(uuid(id),{is_active:false});}

  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/journals')
  listJournals(@Query('limit')q?:string){return this.journals.list(limit(q));}
  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/journals/:id')
  getJournal(@Param('id')id:string){return this.journals.get(uuid(id));}
  @StaffOnly() @Permissions('finance.journal.create') @RequireIdempotency('finance.journal.create') @Post('admin/finance/journals')
  createJournal(@Body()b:any){return this.journals.createDraft(b);}
  @StaffOnly() @Permissions('finance.journal.post') @RequireStepUp() @RequireIdempotency('finance.journal.post') @HttpCode(HttpStatus.OK) @Post('admin/finance/journals/:id/post')
  postJournal(@Param('id')id:string,@Body()b:any){return this.journals.post(uuid(id),reason(b));}
  @StaffOnly() @Permissions('finance.journal.reverse') @RequireStepUp() @RequireIdempotency('finance.journal.reverse') @HttpCode(HttpStatus.OK) @Post('admin/finance/journals/:id/reverse')
  reverseJournal(@Param('id')id:string,@Body()b:any){return this.journals.reverse(uuid(id),reason(b));}

  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/costs')
  listCosts(@Query('limit')q?:string){return this.costs.list(limit(q));}
  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/costs/:id')
  getCost(@Param('id')id:string){return this.costs.get(uuid(id));}
  @StaffOnly() @Permissions('finance.cost.manage') @RequireIdempotency('finance.cost.create') @Post('admin/finance/costs')
  createCost(@Body()b:any){return this.costs.create(b);}
  @StaffOnly() @Permissions('finance.cost.finalize') @RequireStepUp() @RequireIdempotency('finance.cost.finalize') @HttpCode(HttpStatus.OK) @Post('admin/finance/costs/:id/finalize')
  finalizeCost(@Param('id')id:string,@Body()b:any){return this.costs.finalize(uuid(id),{reason_code:b?.reason_code,reason:b?.reason,note:b?.note});}
  @StaffOnly() @Permissions('finance.cost.reverse') @RequireStepUp() @RequireIdempotency('finance.cost.reverse') @HttpCode(HttpStatus.OK) @Post('admin/finance/costs/:id/reverse')
  reverseCost(@Param('id')id:string,@Body()b:any){return this.costs.reverse(uuid(id),reason(b));}

  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/orders/:order_id/profit')
  currentProfit(@Param('order_id')orderId:string){return this.repo.currentProfitView(uuid(orderId));}
  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/orders/:order_id/profit/history')
  profitHistory(@Param('order_id')orderId:string){return this.profits.history(uuid(orderId));}
  @StaffOnly() @Permissions('finance.profit.recalculate') @RequireStepUp() @RequireIdempotency('finance.profit.recalculate') @HttpCode(HttpStatus.OK) @Post('admin/finance/orders/:order_id/profit/recalculate')
  recalculate(@Param('order_id')orderId:string,@Body()b:any){return this.profits.calculate(uuid(orderId),reason(b));}
  @StaffOnly() @Permissions('finance.profit.finalize') @RequireStepUp() @RequireIdempotency('finance.profit.finalize') @HttpCode(HttpStatus.OK) @Post('admin/finance/orders/:order_id/profit/finalize')
  finalizeProfit(@Param('order_id')orderId:string,@Body()b:any){return this.finalization.finalize(uuid(orderId),reason(b));}
  @StaffOnly() @Permissions('finance.profit.finalize') @RequireStepUp() @RequireIdempotency('finance.profit.reverse') @HttpCode(HttpStatus.OK) @Post('admin/finance/orders/:order_id/profit/reverse')
  reverseProfit(@Param('order_id')orderId:string,@Body()b:any){return this.finalization.reverse(uuid(orderId),reason(b));}

  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/profit-rules')
  listRules(@Query('limit')q?:string){return this.rules.list(limit(q,500,1000));}
  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/profit-rules/:id')
  getRule(@Param('id')id:string){return this.rules.get(uuid(id));}
  @StaffOnly() @Permissions('finance.profit_rule.manage') @RequireIdempotency('finance.profit_rule.create') @Post('admin/finance/profit-rules')
  createRule(@Body()b:any){return this.rules.create(b);}
  @StaffOnly() @Permissions('finance.profit_rule.manage') @RequireIdempotency('finance.profit_rule.update') @Patch('admin/finance/profit-rules/:id')
  updateRule(@Param('id')id:string,@Body()b:any){return this.rules.update(uuid(id),b);}
  @StaffOnly() @Permissions('finance.profit_rule.manage') @RequireStepUp() @RequireIdempotency('finance.profit_rule.activate') @HttpCode(HttpStatus.OK) @Post('admin/finance/profit-rules/:id/activate')
  activateRule(@Param('id')id:string,@Body()b:any){return this.rules.activate(uuid(id),reason(b));}
  @StaffOnly() @Permissions('finance.view') @Post('admin/finance/profit-rules/:id/preview')
  async previewRule(@Param('id')id:string,@Body()b:any){const rule=await this.rules.get(uuid(id));return{rule,split:this.rules.split(Number(b?.base_toman),rule.physical_owner_percent,rule.online_owner_percent)};}
  @StaffOnly() @Permissions('finance.profit_rule.manage') @RequireStepUp() @RequireIdempotency('finance.profit_rule.expire') @HttpCode(HttpStatus.OK) @Post('admin/finance/profit-rules/:id/expire')
  expireRule(@Param('id')id:string,@Body()b:any){return this.rules.expire(uuid(id),reason(b),b?.effective_until??b?.expired_at);}

  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/profit-distributions')
  listDistributions(@Query('limit')q?:string){return this.repo.listDistributions(limit(q));}
  @StaffOnly() @Permissions('finance.view') @Get('admin/finance/profit-distributions/:id')
  getDistribution(@Param('id')id:string){return this.repo.distributionById(uuid(id));}

  @StaffOnly() @Permissions('finance.view') @Get('admin/reports')
  reportCatalog(){return this.reporting.catalog();}
  @StaffOnly() @Permissions('finance.report.run') @RequireStepUp() @RequireIdempotency('finance.report.run') @Post('admin/reports/run')
  runReport(@Body()b:any){return this.reporting.run(b);}
  @StaffOnly() @Permissions('finance.view') @Get('admin/reports/jobs/:id')
  reportJob(@Param('id')id:string){return this.reporting.get(uuid(id));}
  @StaffOnly() @Permissions('finance.report.run') @RequireStepUp() @RequireIdempotency('finance.report.cancel') @Post('admin/reports/jobs/:id/cancel')
  cancelReport(@Param('id')id:string,@Body()b:any){return this.reporting.cancel(uuid(id),reason(b));}
  @StaffOnly() @Permissions('finance.export') @RequireStepUp() @RequireIdempotency('finance.export.create') @Post('admin/exports')
  createExport(@Body()b:any){return this.reporting.createExport({report_job_id:uuid(b?.report_job_id),format:b?.format});}
  @StaffOnly() @Permissions('finance.view') @Get('admin/exports/:id')
  getExport(@Param('id')id:string){return this.reporting.getExport(uuid(id));}
  @StaffOnly() @Permissions('finance.export') @RequireStepUp() @Get('admin/exports/:id/download')
  downloadExport(@Param('id')id:string){return this.reporting.download(uuid(id));}
}
