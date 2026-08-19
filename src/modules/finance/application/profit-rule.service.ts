import { Inject,Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager,DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditWriter } from '../../../platform/audit/audit.writer';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { ORDER_FINANCE_PORT,OrderFinancePort } from '../../orders/application/ports/order-finance.port';
import { FinanceRepository } from '../infrastructure/finance.repository';
import { financeEvent } from '../domain/finance.events';

type ScopeType='global'|'category'|'brand'|'product';

@Injectable()
export class ProfitRuleService{
  constructor(
    private readonly tx:TransactionManager,
    private readonly repo:FinanceRepository,
    @Inject(ORDER_FINANCE_PORT) private readonly orders:OrderFinancePort,
    private readonly audit:AuditWriter,
    private readonly outbox:OutboxWriter,
    private readonly ctx:RequestContextStore,
  ){}

  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private uuid(v:unknown){const x=String(v??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return x;}
  private text(v:unknown,max:number){const x=String(v??'').trim();if(!x||x.length>max)throw new DomainError('VALIDATION_ERROR','متن ورودی معتبر نیست.');return x;}
  private scope(v:unknown):ScopeType{const x=String(v??'') as ScopeType;if(!['global','category','brand','product'].includes(x))throw new DomainError('FINANCE_PROFIT_RULE_SCOPE_INVALID','دامنه قاعده سود معتبر نیست.');return x;}
  private priority(v:unknown){const n=Number(v??0);if(!Number.isInteger(n)||n<-1000000||n>1000000)throw new DomainError('FINANCE_PROFIT_RULE_PRIORITY_INVALID','اولویت قاعده سود معتبر نیست.');return n;}
  private timestamp(v:unknown,nullable=false){if(v==null&&nullable)return null;const d=new Date(String(v??''));if(Number.isNaN(d.getTime()))throw new DomainError('FINANCE_PROFIT_RULE_TIME_INVALID','زمان قاعده سود معتبر نیست.');return d;}

  private percentUnits(v:unknown){
    const x=String(v??'').trim();
    if(!/^\d{1,3}(?:\.\d{1,4})?$/.test(x))throw new DomainError('FINANCE_PROFIT_RULE_PERCENT_INVALID','درصد سهم معتبر نیست.');
    const [i,f='']=x.split('.');const units=Number(i)*10000+Number(f.padEnd(4,'0'));
    if(!Number.isInteger(units)||units<0||units>1000000)throw new DomainError('FINANCE_PROFIT_RULE_PERCENT_INVALID','درصد سهم معتبر نیست.');
    return units;
  }
  private percentText(units:number){return `${Math.floor(units/10000)}.${String(units%10000).padStart(4,'0')}`;}

  private normalizeInput(input:any){
    const scopeType=this.scope(input?.scope_type),scopeId=scopeType==='global'?null:this.uuid(input?.scope_id);
    if(scopeType==='global'&&input?.scope_id!=null)throw new DomainError('FINANCE_PROFIT_RULE_GLOBAL_SCOPE_ID_FORBIDDEN','قاعده سراسری شناسه دامنه ندارد.');
    const physicalUnits=this.percentUnits(input?.physical_owner_percent),onlineUnits=this.percentUnits(input?.online_owner_percent);
    if(physicalUnits+onlineUnits!==1000000)throw new DomainError('FINANCE_PROFIT_RULE_PERCENT_SUM_INVALID','مجموع سهم مالک فروشگاه و مالک آنلاین باید دقیقاً ۱۰۰٪ باشد.');
    const effectiveFrom=this.timestamp(input?.effective_from)!;
    const effectiveUntil=this.timestamp(input?.effective_until,true);
    if(effectiveUntil&&effectiveUntil<=effectiveFrom)throw new DomainError('FINANCE_PROFIT_RULE_RANGE_INVALID','بازه زمانی قاعده سود معتبر نیست.');
    return{
      nameFa:this.text(input?.name_fa,200),scopeType,scopeId,priority:this.priority(input?.priority),
      physicalOwnerPercent:this.percentText(physicalUnits),onlineOwnerPercent:this.percentText(onlineUnits),
      effectiveFrom,effectiveUntil
    };
  }

  list(limit=500){const n=Number(limit);return this.repo.listProfitRules(Number.isInteger(n)&&n>0?Math.min(n,1000):500);}
  async get(id:string){const row=await this.repo.profitRuleById(this.repo.db(),this.uuid(id));if(!row)throw new DomainError('FINANCE_PROFIT_RULE_NOT_FOUND','قاعده تقسیم سود پیدا نشد.');return row;}

  async create(input:any){
    const n=this.normalizeInput(input),id=randomUUID(),ctx=this.context();
    return this.tx.run(async ex=>{
      const row=await this.repo.createProfitRule(ex,{id,...n,createdBy:ctx.actor.id});
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.profit_rule.create',
        resourceType:'finance_profit_rule',resourceId:id,afterData:row,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.profit_rule.created.v1','finance_profit_rule',id,1,{
        rule_id:id,status:'draft',name_fa:n.nameFa,scope_type:n.scopeType,scope_id:n.scopeId,priority:n.priority,
        physical_owner_percent:n.physicalOwnerPercent,online_owner_percent:n.onlineOwnerPercent,
        effective_from:n.effectiveFrom.toISOString(),effective_until:n.effectiveUntil?.toISOString()??null
      })],ctx);
      return row;
    });
  }

  async update(idInput:string,input:any){
    const id=this.uuid(idInput),n=this.normalizeInput(input),ctx=this.context();
    return this.tx.run(async ex=>{
      const before=await this.repo.profitRuleById(ex,id,true);if(!before)throw new DomainError('FINANCE_PROFIT_RULE_NOT_FOUND','قاعده تقسیم سود پیدا نشد.');
      if(String(before.status)!=='draft')throw new DomainError('FINANCE_PROFIT_RULE_NOT_DRAFT','فقط قاعده پیش‌نویس قابل ویرایش است.');
      const row=await this.repo.updateDraftProfitRule(ex,id,n);if(!row)throw new DomainError('FINANCE_PROFIT_RULE_STATE_CHANGED','وضعیت قاعده هم‌زمان تغییر کرده است.');
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.profit_rule.update',
        resourceType:'finance_profit_rule',resourceId:id,beforeData:before,afterData:row,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.profit_rule.updated.v1','finance_profit_rule',id,Number(row.version),{
        rule_id:id,status:'draft',name_fa:n.nameFa,scope_type:n.scopeType,scope_id:n.scopeId,priority:n.priority,
        physical_owner_percent:n.physicalOwnerPercent,online_owner_percent:n.onlineOwnerPercent,
        effective_from:n.effectiveFrom.toISOString(),effective_until:n.effectiveUntil?.toISOString()??null
      })],ctx);
      return row;
    });
  }

  async activate(idInput:string,reasonInput:string){
    const id=this.uuid(idInput),reason=this.text(reasonInput,2000),ctx=this.context();
    return this.tx.run(async ex=>{
      const before=await this.repo.profitRuleById(ex,id,true);if(!before)throw new DomainError('FINANCE_PROFIT_RULE_NOT_FOUND','قاعده تقسیم سود پیدا نشد.');
      if(String(before.status)!=='draft')throw new DomainError('FINANCE_PROFIT_RULE_NOT_DRAFT','فقط قاعده پیش‌نویس قابل فعال‌سازی است.');
      const row=await this.repo.activateProfitRule(ex,id);if(!row)throw new DomainError('FINANCE_PROFIT_RULE_STATE_CHANGED','وضعیت قاعده هم‌زمان تغییر کرده است.');
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.profit_rule.activate',
        resourceType:'finance_profit_rule',resourceId:id,beforeData:before,afterData:row,reason,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.profit_rule.activated.v1','finance_profit_rule',id,Number(row.version),{
        rule_id:id,status:'active',activated_at:row.activated_at,reason
      })],ctx);
      return row;
    });
  }

  async expire(idInput:string,reasonInput:string,atInput?:string|null){
    const id=this.uuid(idInput),reason=this.text(reasonInput,2000),at=atInput?this.timestamp(atInput)!:new Date(),ctx=this.context();
    if(at.getTime()>Date.now()+5*60_000)throw new DomainError('FINANCE_PROFIT_RULE_EXPIRE_FUTURE','زمان انقضا نمی‌تواند در آینده باشد.');
    return this.tx.run(async ex=>{
      const before=await this.repo.profitRuleById(ex,id,true);if(!before)throw new DomainError('FINANCE_PROFIT_RULE_NOT_FOUND','قاعده تقسیم سود پیدا نشد.');
      if(String(before.status)!=='active')throw new DomainError('FINANCE_PROFIT_RULE_NOT_ACTIVE','فقط قاعده فعال قابل منقضی‌شدن است.');
      if(at<=new Date(before.effective_from))throw new DomainError('FINANCE_PROFIT_RULE_EXPIRE_RANGE_INVALID','زمان انقضا باید بعد از شروع اثر قاعده باشد.');
      const row=await this.repo.expireProfitRule(ex,id,at);if(!row)throw new DomainError('FINANCE_PROFIT_RULE_STATE_CHANGED','وضعیت قاعده هم‌زمان تغییر کرده است.');
      await this.audit.writeWith(ex,{actorType:ctx.actor.type,actorId:ctx.actor.id,action:'finance.profit_rule.expire',
        resourceType:'finance_profit_rule',resourceId:id,beforeData:before,afterData:row,reason,requestId:ctx.requestId,traceId:ctx.traceId});
      await this.outbox.append(ex,[financeEvent('finance.profit_rule.expired.v1','finance_profit_rule',id,Number(row.version),{
        rule_id:id,status:'expired',expired_at:row.expired_at,effective_until:row.effective_until,reason
      })],ctx);
      return row;
    });
  }

  async resolveForOrder(orderIdInput:string,asOfInput?:Date,exInput?:DatabaseExecutor){
    const orderId=this.uuid(orderIdInput),asOf=asOfInput??new Date(),ex=exInput??this.repo.db();
    const items=await this.orders.ruleContext(ex,orderId);
    if(items.length===0)throw new DomainError('FINANCE_PROFIT_RULE_ORDER_ITEMS_REQUIRED','سفارش قلم قابل ارزیابی برای قاعده سود ندارد.');

    const itemResolutions:any[]=[];
    for(const item of items){
      const candidates=await this.repo.candidateProfitRules(ex,{
        productIds:[item.productId],brandIds:item.brandId?[item.brandId]:[],categoryIds:item.categoryIds,asOf
      });
      if(candidates.length===0)throw new DomainError('FINANCE_PROFIT_RULE_NOT_FOUND','برای یکی از اقلام سفارش هیچ قاعده فعال و منطبق پیدا نشد.',{order_item_id:item.orderItemId});
      const topPriority=Number(candidates[0].priority),topSpecificity=Number(candidates[0].specificity);
      const winners=candidates.filter((x:any)=>Number(x.priority)===topPriority&&Number(x.specificity)===topSpecificity);
      const unique=[...new Map(winners.map((x:any)=>[String(x.id),x])).values()] as any[];
      if(unique.length!==1)throw new DomainError('FINANCE_PROFIT_RULE_ORDER_AMBIGUOUS','برای یکی از اقلام سفارش چند قاعده هم‌رتبه وجود دارد.',{
        order_item_id:item.orderItemId,rule_ids:unique.map(x=>String(x.id)),priority:topPriority,specificity:topSpecificity
      });
      itemResolutions.push({item,rule:unique[0],priority:topPriority,specificity:topSpecificity});
    }

    const ruleIds=[...new Set(itemResolutions.map(x=>String(x.rule.id)))];
    if(ruleIds.length!==1)throw new DomainError('FINANCE_PROFIT_RULE_MIXED_ORDER_UNSUPPORTED',
      'اقلام سفارش به قواعد تقسیم سود متفاوتی رسیده‌اند؛ بدون سیاست تخصیص سود بین اقلام، Finalization مجاز نیست.',
      {rule_ids:ruleIds,order_item_ids:itemResolutions.map(x=>x.item.orderItemId)});

    const selected=itemResolutions[0];
    return{
      rule:selected.rule,
      resolution:{
        order_id:orderId,as_of:asOf.toISOString(),priority:selected.priority,specificity:selected.specificity,
        matched_scope_type:String(selected.rule.scope_type),matched_scope_id:selected.rule.scope_id?String(selected.rule.scope_id):null,
        item_rule_ids:itemResolutions.map(x=>({order_item_id:x.item.orderItemId,rule_id:String(x.rule.id)})),
        uniform_rule:true
      }
    };
  }

  split(baseTomanInput:number,physicalPercentInput:unknown,onlinePercentInput:unknown){
    const base=Number(baseTomanInput);if(!Number.isSafeInteger(base))throw new DomainError('FINANCE_MONEY_OVERFLOW','مبلغ قابل تقسیم از محدوده امن خارج است.');
    const physicalUnits=this.percentUnits(physicalPercentInput),onlineUnits=this.percentUnits(onlinePercentInput);
    if(physicalUnits+onlineUnits!==1000000)throw new DomainError('FINANCE_PROFIT_RULE_PERCENT_SUM_INVALID','مجموع درصدهای تقسیم باید دقیقاً ۱۰۰٪ باشد.');
    const magnitude=BigInt(Math.abs(base)),den=1000000n;
    let physical=(magnitude*BigInt(physicalUnits))/den,online=(magnitude*BigInt(onlineUnits))/den;
    const physicalRem=(magnitude*BigInt(physicalUnits))%den,onlineRem=(magnitude*BigInt(onlineUnits))%den;
    let leftover=magnitude-physical-online;
    if(leftover>0n){
      if(physicalRem>=onlineRem)physical+=leftover;else online+=leftover;
      leftover=0n;
    }
    const sign=base<0?-1n:1n;
    const p=Number(physical*sign),o=Number(online*sign);
    if(!Number.isSafeInteger(p)||!Number.isSafeInteger(o)||p+o!==base)throw new DomainError('FINANCE_DISTRIBUTION_ROUNDING_ERROR','تقسیم سود به تومان دقیق انجام نشد.');
    return{base_toman:base,physical_owner_share_toman:p,online_owner_share_toman:o,
      physical_owner_percent:this.percentText(physicalUnits),online_owner_percent:this.percentText(onlineUnits),
      rounding:'largest_remainder_physical_tie_break'};
  }

  async previewOrder(orderId:string,baseToman:number,asOf?:Date){
    const resolved=await this.resolveForOrder(orderId,asOf);
    const split=this.split(baseToman,resolved.rule.physical_owner_percent,resolved.rule.online_owner_percent);
    return{rule_id:String(resolved.rule.id),rule:resolved.rule,resolution:resolved.resolution,split};
  }
}
