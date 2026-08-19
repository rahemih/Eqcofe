import { Inject,Injectable } from '@nestjs/common';
import { createHash,randomUUID } from 'node:crypto';
import { TransactionManager,DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { ORDER_FINANCE_PORT,OrderFinancePort } from '../../orders/application/ports/order-finance.port';
import { PAYMENT_FINANCE_PORT,PaymentFinancePort } from '../../payments/application/ports/payment-finance.port';
import { INVENTORY_FINANCE_PORT,InventoryFinancePort } from '../../inventory/application/ports/inventory-finance.port';
import { FinanceRepository } from '../infrastructure/finance.repository';
import { financeEvent } from '../domain/finance.events';

export interface BuiltProfitFacts{
  stage:'estimated'|'provisional';
  order:any;payment:any;cogs:any;costs:any;
  netSalesToman:number;cogsToman:number;onlineCostsToman:number;
  shippingRevenueToman:number;shippingCostToman:number;shippingMarginToman:number;
  profitBeforeDistributionToman:number;sourceSnapshot:Record<string,unknown>;sourceFingerprint:string;
}

@Injectable()
export class ProfitCalculationService{
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:FinanceRepository,
    @Inject(ORDER_FINANCE_PORT) private readonly orders:OrderFinancePort,
    @Inject(PAYMENT_FINANCE_PORT) private readonly payments:PaymentFinancePort,
    @Inject(INVENTORY_FINANCE_PORT) private readonly inventory:InventoryFinancePort,
    private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,
    private readonly ctx:RequestContextStore,
  ){}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private text(v:unknown,max:number){const x=String(v??'').trim();if(!x||x.length>max)throw new DomainError('VALIDATION_ERROR','دلیل محاسبه معتبر نیست.');return x;}
  private safe(...values:number[]){for(const v of values)if(!Number.isSafeInteger(v))throw new DomainError('FINANCE_MONEY_OVERFLOW','مبلغ مالی از محدوده امن خارج است.');}
  private fingerprint(v:unknown){return createHash('sha256').update(JSON.stringify(v)).digest('hex');}

  history(orderId:string){return this.repo.profitHistory(this.uuid(orderId));}

  async buildFactsInTransaction(ex:DatabaseExecutor,orderId:string,lock=true):Promise<BuiltProfitFacts>{
    const order=await this.orders.snapshot(ex,orderId,lock);
    if(!order)throw new DomainError('FINANCE_ORDER_NOT_FOUND','سفارش برای محاسبه سود پیدا نشد.');

    const payment=await this.payments.snapshot(ex,orderId,lock);
    const cogs=await this.inventory.cogsForOrder(ex,orderId,lock);
    const costs=await this.repo.profitCostSnapshot(ex,orderId);

    const settledStatuses=new Set(['paid','late_received','refund_required','refunded']);
    const stage:'estimated'|'provisional'=payment.status&&settledStatuses.has(payment.status)?'provisional':'estimated';

    const netSalesToman=order.merchandiseRevenueToman-payment.committedRefundToman;
    const shippingRevenueToman=order.shippingToman;
    const shippingCostToman=costs.shippingCostToman;
    const shippingMarginToman=shippingRevenueToman-shippingCostToman;
    const onlineCostsToman=costs.onlineCostsToman;
    const cogsToman=cogs.netCogsToman;
    const profitBeforeDistributionToman=netSalesToman-cogsToman-onlineCostsToman+shippingMarginToman;
    this.safe(netSalesToman,shippingRevenueToman,shippingCostToman,shippingMarginToman,onlineCostsToman,cogsToman,profitBeforeDistributionToman,
      payment.committedRefundToman,payment.succeededRefundToman,cogs.grossCogsToman,cogs.returnedCogsToman);

    const sourceSnapshot={
      version:2,
      order:{
        order_id:order.orderId,order_number:order.orderNumber,status:order.status,created_at:order.createdAt.toISOString(),
        subtotal_toman:order.subtotalToman,discount_toman:order.discountToman,merchandise_revenue_toman:order.merchandiseRevenueToman,
        shipping_toman:order.shippingToman,tax_toman:order.taxToman,total_toman:order.totalToman,
      },
      payment:{
        payment_id:payment.paymentId,status:payment.status,amount_toman:payment.amountToman,
        committed_refund_toman:payment.committedRefundToman,succeeded_refund_toman:payment.succeededRefundToman,
        unresolved_refund_toman:payment.unresolvedRefundToman,
      },
      inventory:{
        gross_cogs_toman:cogs.grossCogsToman,returned_cogs_toman:cogs.returnedCogsToman,net_cogs_toman:cogs.netCogsToman,
        consumption_count:cogs.consumptionCount,return_layer_count:cogs.returnLayerCount,
      },
      finance_costs:{
        online_costs_toman:onlineCostsToman,shipping_cost_toman:shippingCostToman,
        shipping_excluded_from_online_costs:true,
      },
      finalization_blockers:{
        payment_unsettled:!payment.status||!new Set(['paid','late_received','refunded']).has(payment.status),
        unresolved_refund:payment.unresolvedRefundToman>0,
        committed_refund_not_succeeded:payment.committedRefundToman!==payment.succeededRefundToman,
        stage_is_not_final:true,
      }
    };
    return{stage,order,payment,cogs,costs,netSalesToman,cogsToman,onlineCostsToman,shippingRevenueToman,shippingCostToman,
      shippingMarginToman,profitBeforeDistributionToman,sourceSnapshot,sourceFingerprint:this.fingerprint(sourceSnapshot)};
  }

  async calculateInTransaction(ex:DatabaseExecutor,orderIdInput:string,reasonInput:string){
    const orderId=this.uuid(orderIdInput),reason=this.text(reasonInput,2000),ctx=this.context();
    const f=await this.buildFactsInTransaction(ex,orderId,true);
    const current=await this.repo.profitCurrent(ex,orderId,f.stage,true);
    if(current&&String(current.source_fingerprint??'')===f.sourceFingerprint)return current;
    if(current){
      const superseded=await this.repo.supersedeProfitCalculation(ex,String(current.id));
      if(!superseded)throw new DomainError('FINANCE_PROFIT_CONCURRENT_RECALCULATION','محاسبه سود هم‌زمان تغییر کرده است.');
    }

    const id=randomUUID(),calculationKey=randomUUID();
    const row=await this.repo.createProfitCalculation(ex,{
      id,calculationKey,orderId,stage:f.stage,netSalesToman:f.netSalesToman,cogsToman:f.cogsToman,
      onlineCostsToman:f.onlineCostsToman,shippingMarginToman:f.shippingMarginToman,
      profitBeforeDistributionToman:f.profitBeforeDistributionToman,sourceSnapshot:f.sourceSnapshot,
      supersedesId:current?String(current.id):null,reason,sourceFingerprint:f.sourceFingerprint,
      refundCommittedToman:f.payment.committedRefundToman,refundSucceededToman:f.payment.succeededRefundToman,
      grossCogsToman:f.cogs.grossCogsToman,returnedCogsToman:f.cogs.returnedCogsToman,
      shippingRevenueToman:f.shippingRevenueToman,shippingCostToman:f.shippingCostToman
    });

    await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.profit.calculate',
      resourceType:'finance_profit_calculation',resourceId:id,afterData:row,reason,requestId:ctx.requestId,traceId:ctx.traceId});
    await this.outbox.append(ex,[financeEvent('finance.profit.calculated.v1','finance_profit_calculation',id,1,{
      calculation_id:id,calculation_key:calculationKey,order_id:orderId,stage:f.stage,
      net_sales_toman:f.netSalesToman,cogs_toman:f.cogsToman,online_costs_toman:f.onlineCostsToman,
      shipping_margin_toman:f.shippingMarginToman,profit_before_distribution_toman:f.profitBeforeDistributionToman,
      source_fingerprint:f.sourceFingerprint,supersedes_id:current?String(current.id):null
    })],ctx);
    return row;
  }

  async calculate(orderIdInput:string,reasonInput:string){
    return this.tx.run(ex=>this.calculateInTransaction(ex,orderIdInput,reasonInput));
  }
}
