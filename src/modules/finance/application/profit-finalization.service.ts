import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { FinanceRepository } from '../infrastructure/finance.repository';
import { ProfitCalculationService } from './profit-calculation.service';
import { ProfitRuleService } from './profit-rule.service';
import { financeEvent } from '../domain/finance.events';

@Injectable()
export class ProfitFinalizationService{
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:FinanceRepository,
    private readonly calc:ProfitCalculationService,
    private readonly rules:ProfitRuleService,
    private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,
    private readonly ctx:RequestContextStore,
  ){}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private text(v:unknown,max:number){const x=String(v??'').trim();if(!x||x.length>max)throw new DomainError('VALIDATION_ERROR','دلیل عملیات مالی معتبر نیست.');return x;}

  async finalize(orderIdInput:string,reasonInput:string){
    const orderId=this.uuid(orderIdInput),reason=this.text(reasonInput,2000),ctx=this.context();
    return this.tx.run(async ex=>{
      const currentFinal=await this.repo.currentFinalProfit(ex,orderId,true);
      if(currentFinal){
        const distribution=await this.repo.distributionForCalculation(ex,String(currentFinal.id),false);
        return{calculation:currentFinal,distribution,idempotent:true};
      }

      const fresh=await this.calc.buildFactsInTransaction(ex,orderId,true);
      if(fresh.stage!=='provisional')throw new DomainError('FINANCE_PROFIT_NOT_PROVISIONAL','فقط سود موقتِ مبتنی بر پرداخت نهایی قابل قطعی‌شدن است.');
      if(!fresh.payment.status||!['paid','late_received','refunded'].includes(fresh.payment.status))
        throw new DomainError('FINANCE_PAYMENT_NOT_SETTLED','پرداخت سفارش هنوز برای قطعی‌کردن سود نهایی نشده است.');
      if(fresh.payment.unresolvedRefundToman!==0)
        throw new DomainError('FINANCE_REFUND_UNRESOLVED','بازپرداخت حل‌نشده وجود دارد.');
      if(fresh.payment.committedRefundToman!==fresh.payment.succeededRefundToman)
        throw new DomainError('FINANCE_REFUND_NOT_SETTLED','همه بازپرداخت‌های منظورشده باید قطعی شده باشند.');
      if(await this.repo.draftOrderCostCount(ex,orderId)>0)
        throw new DomainError('FINANCE_DRAFT_COSTS_EXIST','تا زمانی که هزینه پیش‌نویس برای سفارش وجود دارد، سود نهایی قابل قطعی‌شدن نیست.');

      const provisional=await this.repo.profitCurrent(ex,orderId,'provisional',true);
      if(!provisional)throw new DomainError('FINANCE_PROVISIONAL_PROFIT_REQUIRED','ابتدا باید محاسبه سود موقت ایجاد شود.');
      if(String(provisional.source_fingerprint??'')!==fresh.sourceFingerprint)
        throw new DomainError('FINANCE_PROVISIONAL_PROFIT_STALE','داده‌های مالی از آخرین محاسبه موقت تغییر کرده‌اند؛ ابتدا محاسبه مجدد لازم است.');

      const resolved=await this.rules.resolveForOrder(orderId,fresh.order.createdAt,ex);
      const physicalPercent=String(resolved.rule.physical_owner_percent);
      const onlinePercent=String(resolved.rule.online_owner_percent);
      const split=this.rules.split(fresh.profitBeforeDistributionToman,physicalPercent,onlinePercent);

      const finalSnapshot={
        ...fresh.sourceSnapshot,
        finalization:{
          finalized_from_calculation_id:String(provisional.id),
          selected_rule_id:String(resolved.rule.id),
          selected_rule_version:Number(resolved.rule.version),
          physical_owner_percent:physicalPercent,
          online_owner_percent:onlinePercent,
          rule_resolution:resolved.resolution,
          finalized_at:new Date().toISOString()
        }
      };
      const finalSource={...fresh,sourceSnapshot:finalSnapshot};
      const finalId=randomUUID(),calculationKey=randomUUID();
      const final=await this.repo.createFinalProfit(ex,{
        id:finalId,calculationKey,orderId,source:finalSource,selectedRuleId:String(resolved.rule.id),
        physicalOwnerPercent:physicalPercent,onlineOwnerPercent:onlinePercent,reason,sourceFingerprint:fresh.sourceFingerprint,
        finalizedBy:ctx.actor.id
      });
      const distributionId=randomUUID();
      const distribution=await this.repo.createDistribution(ex,{
        id:distributionId,profitCalculationId:finalId,orderId,baseToman:fresh.profitBeforeDistributionToman,
        physicalPercent,onlinePercent,physicalShare:split.physical_owner_share_toman,onlineShare:split.online_owner_share_toman,effectSign:1
      });

      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.profit.finalize',
        resourceType:'finance_profit_calculation',resourceId:finalId,afterData:{final,distribution},reason,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[
        financeEvent('finance.profit.finalized.v1','finance_profit_calculation',finalId,1,{
          calculation_id:finalId,order_id:orderId,selected_rule_id:String(resolved.rule.id),
          profit_before_distribution_toman:fresh.profitBeforeDistributionToman,physical_owner_percent:physicalPercent,
          online_owner_percent:onlinePercent,source_fingerprint:fresh.sourceFingerprint
        }),
        financeEvent('finance.profit_distribution.finalized.v1','finance_profit_distribution',distributionId,1,{
          distribution_id:distributionId,calculation_id:finalId,order_id:orderId,distributable_base_toman:fresh.profitBeforeDistributionToman,
          physical_owner_share_toman:split.physical_owner_share_toman,online_owner_share_toman:split.online_owner_share_toman
        })
      ],ctx);
      return{calculation:final,distribution,idempotent:false};
    });
  }

  async reverseInTransaction(ex:any,orderIdInput:string,reasonInput:string){
    const orderId=this.uuid(orderIdInput),reason=this.text(reasonInput,2000),ctx=this.context();
      const final=await this.repo.currentFinalProfit(ex,orderId,true);
      if(!final)throw new DomainError('FINANCE_FINAL_PROFIT_NOT_FOUND','سود نهایی فعالی برای برگشت وجود ندارد.');
      const original=await this.repo.distributionForCalculation(ex,String(final.id),true);
      if(!original)throw new DomainError('FINANCE_DISTRIBUTION_NOT_FOUND','تقسیم سود نهایی پیدا نشد.');
      if(String(original.status)!=='finalized')throw new DomainError('FINANCE_DISTRIBUTION_NOT_REVERSIBLE','تقسیم سود قبلاً برگشت خورده است.');
      if(await this.repo.reversalDistributionFor(ex,String(original.id)))
        throw new DomainError('FINANCE_DISTRIBUTION_ALREADY_REVERSED','برای این تقسیم سود قبلاً رکورد برگشت ثبت شده است.');

      const reversalId=randomUUID();
      const reversal=await this.repo.createDistribution(ex,{
        id:reversalId,profitCalculationId:String(final.id),orderId,
        baseToman:-Number(original.distributable_base_toman),
        physicalPercent:String(original.physical_owner_percent),onlinePercent:String(original.online_owner_percent),
        physicalShare:-Number(original.physical_owner_share_toman),onlineShare:-Number(original.online_owner_share_toman),
        effectSign:-1,reversalOfId:String(original.id)
      });
      const reversed=await this.repo.markDistributionReversed(ex,String(original.id));
      if(!reversed)throw new DomainError('FINANCE_DISTRIBUTION_STATE_CHANGED','وضعیت تقسیم سود هم‌زمان تغییر کرده است.');
      const deactivated=await this.repo.markFinalNotCurrent(ex,String(final.id));
      if(!deactivated)throw new DomainError('FINANCE_FINAL_PROFIT_STATE_CHANGED','وضعیت سود نهایی هم‌زمان تغییر کرده است.');

      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.profit.reverse',
        resourceType:'finance_profit_calculation',resourceId:String(final.id),beforeData:{final,distribution:original},
        afterData:{final:deactivated,distribution:reversed,reversal},reason,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[
        financeEvent('finance.profit_distribution.reversal_finalized.v1','finance_profit_distribution',reversalId,1,{
          distribution_id:reversalId,reversal_of_id:String(original.id),calculation_id:String(final.id),order_id:orderId,
          distributable_base_toman:Number(reversal.distributable_base_toman),
          physical_owner_share_toman:Number(reversal.physical_owner_share_toman),online_owner_share_toman:Number(reversal.online_owner_share_toman)
        }),
        financeEvent('finance.profit.reversed.v1','finance_profit_calculation',String(final.id),Number(deactivated.version),{
          calculation_id:String(final.id),order_id:orderId,reversal_distribution_id:reversalId,reason
        })
      ],ctx);
      return{calculation:deactivated,distribution:reversed,reversal};
  }

  async reverse(orderIdInput:string,reasonInput:string){
    return this.tx.run(ex=>this.reverseInTransaction(ex,orderIdInput,reasonInput));
  }
}
