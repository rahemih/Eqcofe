import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { FinanceRepository } from '../infrastructure/finance.repository';
import { financeEvent } from '../domain/finance.events';

type CostTreatment='deduct_before_profit_split'|'capitalized_into_cost'|'non_distributable_cost'|'informational_only';

@Injectable()
export class CostLedgerService{
  constructor(private readonly tx:TransactionManager,private readonly repo:FinanceRepository,private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,private readonly ctx:RequestContextStore){}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private text(v:unknown,max:number,required=true){const x=v==null?'':String(v).trim();if((required&&!x)||x.length>max)throw new DomainError('VALIDATION_ERROR','متن ورودی معتبر نیست.');return x||null;}
  private money(v:unknown){const n=Number(v);if(!Number.isSafeInteger(n)||n<0)throw new DomainError('FINANCE_COST_AMOUNT_INVALID','مبلغ هزینه معتبر نیست.');return n;}
  private occurred(v:unknown){const d=new Date(String(v??''));if(Number.isNaN(d.getTime()))throw new DomainError('FINANCE_COST_OCCURRED_AT_INVALID','زمان هزینه معتبر نیست.');if(d.getTime()>Date.now()+5*60_000)throw new DomainError('FINANCE_COST_OCCURRED_AT_FUTURE','زمان هزینه نمی‌تواند در آینده باشد.');return d;}
  private treatment(v:unknown):CostTreatment{
    const x=String(v??'') as CostTreatment;
    if(!['deduct_before_profit_split','capitalized_into_cost','non_distributable_cost','informational_only'].includes(x))
      throw new DomainError('FINANCE_COST_TREATMENT_INVALID','نحوه اثر هزینه معتبر نیست.');
    return x;
  }

  list(limit=200){const n=Number(limit);return this.repo.listCosts(Number.isInteger(n)&&n>0?Math.min(n,500):200);}
  async get(id:string){const row=await this.repo.costById(this.repo.db(),this.uuid(id));if(!row)throw new DomainError('FINANCE_COST_NOT_FOUND','هزینه مالی پیدا نشد.');return row;}
  effectiveOrderCosts(orderId:string){return this.repo.effectiveOrderCosts(this.repo.db(),this.uuid(orderId));}

  async create(input:{
    order_id?:string|null;order_item_id?:string|null;campaign_id?:string|null;cost_type:string;cost_treatment:CostTreatment;
    amount_toman:number;occurred_at:string;description?:string|null;source_event_id?:string|null;
    capitalization_source_type?:string|null;capitalization_source_id?:string|null;
  }){
    const orderId=input.order_id==null?null:this.uuid(input.order_id),orderItemId=input.order_item_id==null?null:this.uuid(input.order_item_id),
      campaignId=input.campaign_id==null?null:this.uuid(input.campaign_id),costType=this.text(input.cost_type,60,true)!,
      costTreatment=this.treatment(input.cost_treatment),amountToman=this.money(input.amount_toman),occurredAt=this.occurred(input.occurred_at),
      description=this.text(input.description,2000,false),sourceEventId=input.source_event_id==null?null:this.uuid(input.source_event_id),
      capitalizationSourceType=this.text(input.capitalization_source_type,60,false),
      capitalizationSourceId=input.capitalization_source_id==null?null:this.uuid(input.capitalization_source_id);

    if(orderItemId&&!orderId)throw new DomainError('FINANCE_COST_ORDER_REQUIRED','برای هزینه قلم سفارش، شناسه سفارش الزامی است.');
    if(campaignId&&orderId)throw new DomainError('FINANCE_COST_SCOPE_CONFLICT','هزینه نمی‌تواند هم‌زمان متعلق به سفارش و کمپین باشد.');
    if(costTreatment==='capitalized_into_cost'){
      if((capitalizationSourceType==null)!==(capitalizationSourceId==null))throw new DomainError('FINANCE_CAPITALIZATION_SOURCE_INCOMPLETE','مرجع سرمایه‌ای هزینه ناقص است.');
    }else if(capitalizationSourceType||capitalizationSourceId){
      throw new DomainError('FINANCE_CAPITALIZATION_SOURCE_UNEXPECTED','مرجع سرمایه‌ای فقط برای هزینه سرمایه‌ای مجاز است.');
    }

    const id=randomUUID(),ctx=this.context();
    return this.tx.run(async ex=>{
      const row=await this.repo.createCost(ex,{id,orderId,orderItemId,campaignId,costType,costTreatment,amountToman,occurredAt,description,
        status:'draft',sourceEventId,createdBy:ctx.actor.id,effectSign:1,capitalizationSourceType,capitalizationSourceId});
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.cost.create',resourceType:'finance_cost',
        resourceId:id,afterData:row,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.cost.created.v1','finance_cost',id,1,{cost_id:id,order_id:orderId,order_item_id:orderItemId,
        campaign_id:campaignId,cost_type:costType,cost_treatment:costTreatment,amount_toman:amountToman,status:'draft'})],ctx);
      return row;
    });
  }

  async finalize(idInput:string,input:{reason_code?:string|null;reason?:string|null;note?:string|null}={}){
    const id=this.uuid(idInput),reasonCode=this.text(input.reason_code,80,false),reason=this.text(input.reason,2000,false),
      note=this.text(input.note,4000,false),ctx=this.context();
    const auditReason=[reasonCode,reason,note].filter(Boolean).join(' | ')||'finance_cost_finalize';
    return this.tx.run(async ex=>{
      const before=await this.repo.costById(ex,id,true);if(!before)throw new DomainError('FINANCE_COST_NOT_FOUND','هزینه مالی پیدا نشد.');
      if(String(before.status)!=='draft')throw new DomainError('FINANCE_COST_NOT_DRAFT','فقط هزینه پیش‌نویس قابل قطعی‌شدن است.');
      if(String(before.cost_treatment)==='capitalized_into_cost'&&(!before.capitalization_source_type||!before.capitalization_source_id))
        throw new DomainError('FINANCE_CAPITALIZED_COST_SOURCE_REQUIRED','برای قطعی‌کردن هزینه سرمایه‌ای، مرجع هزینه موجودی الزامی است.');
      const row=await this.repo.finalizeCost(ex,id,ctx.actor.id);if(!row)throw new DomainError('FINANCE_COST_STATE_CHANGED','وضعیت هزینه هم‌زمان تغییر کرده است.');
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.cost.finalize',resourceType:'finance_cost',
        resourceId:id,beforeData:before,afterData:row,reason:auditReason,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.cost.finalized.v1','finance_cost',id,Number(row.version),{cost_id:id,order_id:row.order_id?String(row.order_id):null,
        order_item_id:row.order_item_id?String(row.order_item_id):null,cost_type:String(row.cost_type),cost_treatment:String(row.cost_treatment),
        amount_toman:Number(row.amount_toman),effect_sign:1,status:'finalized'})],ctx);
      return row;
    });
  }

  async reverse(idInput:string,commentInput?:string|null){
    const id=this.uuid(idInput),comment=this.text(commentInput,2000,true)!,ctx=this.context();
    return this.tx.run(async ex=>{
      const original=await this.repo.costById(ex,id,true);if(!original)throw new DomainError('FINANCE_COST_NOT_FOUND','هزینه مالی پیدا نشد.');
      if(String(original.status)!=='finalized'||Number(original.effect_sign)!==1)throw new DomainError('FINANCE_COST_NOT_REVERSIBLE','فقط هزینه قطعی اصلی قابل برگشت است.');
      if(await this.repo.reversalCostFor(ex,id))throw new DomainError('FINANCE_COST_ALREADY_REVERSED','این هزینه قبلاً برگشت خورده است.');

      const reversalId=randomUUID();
      const reversal=await this.repo.createCost(ex,{id:reversalId,orderId:original.order_id?String(original.order_id):null,
        orderItemId:original.order_item_id?String(original.order_item_id):null,campaignId:original.campaign_id?String(original.campaign_id):null,
        costType:String(original.cost_type),costTreatment:String(original.cost_treatment),amountToman:Number(original.amount_toman),
        occurredAt:new Date(),description:`برگشت هزینه ${id} — ${comment}`,status:'finalized',reversalOfId:id,createdBy:ctx.actor.id,
        finalizedBy:ctx.actor.id,effectSign:-1,capitalizationSourceType:original.capitalization_source_type?String(original.capitalization_source_type):null,
        capitalizationSourceId:original.capitalization_source_id?String(original.capitalization_source_id):null});
      const reversed=await this.repo.markCostReversed(ex,id,ctx.actor.id);if(!reversed)throw new DomainError('FINANCE_COST_STATE_CHANGED','وضعیت هزینه هم‌زمان تغییر کرده است.');

      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.cost.reverse',resourceType:'finance_cost',
        resourceId:id,beforeData:original,afterData:{original:reversed,reversal},reason:comment,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[
        financeEvent('finance.cost.reversal_finalized.v1','finance_cost',reversalId,1,{cost_id:reversalId,reversal_of_id:id,
          order_id:reversal.order_id?String(reversal.order_id):null,cost_treatment:String(reversal.cost_treatment),amount_toman:Number(reversal.amount_toman),effect_sign:-1}),
        financeEvent('finance.cost.reversed.v1','finance_cost',id,Number(reversed.version),{cost_id:id,reversal_cost_id:reversalId,reason:comment})
      ],ctx);
      return{original:reversed,reversal};
    });
  }
}
