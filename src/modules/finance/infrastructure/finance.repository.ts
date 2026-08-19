import { DomainError } from '../../../shared/errors/domain-error';
import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor,TransactionManager } from '../../../platform/database/transaction-manager';

@Injectable()
export class FinanceRepository{
  constructor(private readonly tx:TransactionManager){}
  db(){return this.tx.readonly();}

  async accountById(ex:DatabaseExecutor,id:string,lock=false){
    const r=await sql<any>`SELECT * FROM finance.accounts WHERE id=${id}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }
  async accountByCode(ex:DatabaseExecutor,code:string){
    const r=await sql<any>`SELECT * FROM finance.accounts WHERE lower(code)=lower(${code})`.execute(ex);return r.rows[0]??null;
  }
  async listAccounts(){
    return (await sql<any>`SELECT * FROM finance.accounts ORDER BY code,id`.execute(this.db())).rows;
  }
  async createAccount(ex:DatabaseExecutor,input:{id:string;code:string;nameFa:string;accountType:string;normalBalance:string;parentId?:string|null;systemKey?:string|null;isPostable:boolean}){
    const r=await sql<any>`INSERT INTO finance.accounts(id,code,name_fa,account_type,normal_balance,parent_id,system_key,is_postable,is_active)
      VALUES(${input.id}::uuid,${input.code},${input.nameFa},${input.accountType},${input.normalBalance},${input.parentId??null}::uuid,${input.systemKey??null},${input.isPostable},true)
      RETURNING *`.execute(ex);return r.rows[0];
  }
  async updateAccount(ex:DatabaseExecutor,id:string,input:{nameFa?:string;parentId?:string|null;isPostable?:boolean;isActive?:boolean}){
    const r=await sql<any>`UPDATE finance.accounts SET
      name_fa=COALESCE(${input.nameFa??null},name_fa),
      parent_id=CASE WHEN ${Object.prototype.hasOwnProperty.call(input,'parentId')} THEN ${input.parentId??null}::uuid ELSE parent_id END,
      is_postable=COALESCE(${input.isPostable??null},is_postable),
      is_active=COALESCE(${input.isActive??null},is_active),
      version=version+1,updated_at=now()
      WHERE id=${id}::uuid RETURNING *`.execute(ex);return r.rows[0]??null;
  }


  async costById(ex:DatabaseExecutor,id:string,lock=false){
    const r=await sql<any>`SELECT * FROM finance.costs WHERE id=${id}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }
  async reversalCostFor(ex:DatabaseExecutor,id:string){
    const r=await sql<any>`SELECT * FROM finance.costs WHERE reversal_of_id=${id}::uuid`.execute(ex);return r.rows[0]??null;
  }
  async listCosts(limit=200){
    return (await sql<any>`SELECT * FROM finance.costs ORDER BY occurred_at DESC,id DESC LIMIT ${limit}`.execute(this.db())).rows;
  }
  async createCost(ex:DatabaseExecutor,input:{
    id:string;orderId?:string|null;orderItemId?:string|null;campaignId?:string|null;costType:string;costTreatment:string;
    amountToman:number;occurredAt:Date;description?:string|null;status:'draft'|'finalized';reversalOfId?:string|null;
    sourceEventId?:string|null;createdBy?:string|null;finalizedBy?:string|null;effectSign:1|-1;
    capitalizationSourceType?:string|null;capitalizationSourceId?:string|null;
  }){
    const r=await sql<any>`INSERT INTO finance.costs(
      id,order_id,order_item_id,campaign_id,cost_type,cost_treatment,amount_toman,occurred_at,description,status,
      reversal_of_id,source_event_id,finalized_at,created_by,finalized_by,effect_sign,capitalization_source_type,capitalization_source_id)
      VALUES(${input.id}::uuid,${input.orderId??null}::uuid,${input.orderItemId??null}::uuid,${input.campaignId??null}::uuid,
      ${input.costType},${input.costTreatment},${input.amountToman},${input.occurredAt},${input.description??null},${input.status},
      ${input.reversalOfId??null}::uuid,${input.sourceEventId??null}::uuid,${input.status==='finalized'?new Date():null},
      ${input.createdBy??null}::uuid,${input.finalizedBy??null}::uuid,${input.effectSign},
      ${input.capitalizationSourceType??null},${input.capitalizationSourceId??null}::uuid)
      RETURNING *`.execute(ex);return r.rows[0];
  }
  async finalizeCost(ex:DatabaseExecutor,id:string,finalizedBy?:string|null){
    const r=await sql<any>`UPDATE finance.costs SET status='finalized',finalized_at=now(),finalized_by=${finalizedBy??null}::uuid,
      version=version+1,updated_at=now() WHERE id=${id}::uuid AND status='draft' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }
  async markCostReversed(ex:DatabaseExecutor,id:string,reversedBy?:string|null){
    const r=await sql<any>`UPDATE finance.costs SET status='reversed',reversed_at=now(),reversed_by=${reversedBy??null}::uuid,
      version=version+1,updated_at=now() WHERE id=${id}::uuid AND status='finalized' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }
  async effectiveOrderCosts(ex:DatabaseExecutor,orderId:string,treatment?:string){
    const r=await sql<any>`SELECT cost_treatment,COALESCE(sum(amount_toman*effect_sign),0)::bigint net_toman
      FROM finance.costs
      WHERE order_id=${orderId}::uuid AND status IN ('finalized','reversed')
        AND (${treatment??null}::text IS NULL OR cost_treatment=${treatment??null})
      GROUP BY cost_treatment ORDER BY cost_treatment`.execute(ex);
    return r.rows;
  }


  async profitCurrent(ex:DatabaseExecutor,orderId:string,stage:'estimated'|'provisional',lock=false){
    const r=await sql<any>`SELECT * FROM finance.profit_calculations
      WHERE order_id=${orderId}::uuid AND calculation_stage=${stage} AND is_current
      ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }
  async createProfitCalculation(ex:DatabaseExecutor,input:{
    id:string;calculationKey:string;orderId:string;stage:'estimated'|'provisional';netSalesToman:number;cogsToman:number;
    onlineCostsToman:number;shippingMarginToman:number;profitBeforeDistributionToman:number;sourceSnapshot:Record<string,unknown>;
    supersedesId?:string|null;reason:string;sourceFingerprint:string;refundCommittedToman:number;refundSucceededToman:number;
    grossCogsToman:number;returnedCogsToman:number;shippingRevenueToman:number;shippingCostToman:number;
  }){
    const r=await sql<any>`INSERT INTO finance.profit_calculations(
      id,calculation_key,order_id,calculation_stage,net_sales_toman,cogs_toman,online_costs_toman,shipping_margin_toman,
      profit_before_distribution_toman,source_snapshot,is_current,supersedes_id,reason,source_fingerprint,
      refund_committed_toman,refund_succeeded_toman,gross_cogs_toman,returned_cogs_toman,shipping_revenue_toman,shipping_cost_toman)
      VALUES(${input.id}::uuid,${input.calculationKey}::uuid,${input.orderId}::uuid,${input.stage},${input.netSalesToman},
      ${input.cogsToman},${input.onlineCostsToman},${input.shippingMarginToman},${input.profitBeforeDistributionToman},
      ${JSON.stringify(input.sourceSnapshot)}::jsonb,true,${input.supersedesId??null}::uuid,${input.reason},${input.sourceFingerprint},
      ${input.refundCommittedToman},${input.refundSucceededToman},${input.grossCogsToman},${input.returnedCogsToman},
      ${input.shippingRevenueToman},${input.shippingCostToman}) RETURNING *`.execute(ex);
    return r.rows[0];
  }
  async supersedeProfitCalculation(ex:DatabaseExecutor,id:string){
    const r=await sql<any>`UPDATE finance.profit_calculations SET is_current=false,version=version+1
      WHERE id=${id}::uuid AND is_current AND calculation_stage<>'final' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }
  async profitHistory(orderId:string){
    return (await sql<any>`SELECT * FROM finance.profit_calculations WHERE order_id=${orderId}::uuid
      ORDER BY calculated_at DESC,id DESC`.execute(this.db())).rows;
  }
  async draftOrderCostCount(ex:DatabaseExecutor,orderId:string){
    const r=await sql<any>`SELECT count(*)::int count FROM finance.costs
      WHERE order_id=${orderId}::uuid AND status='draft'`.execute(ex);
    return Number(r.rows[0]?.count??0);
  }

  async profitCostSnapshot(ex:DatabaseExecutor,orderId:string){
    const r=await sql<any>`SELECT
      COALESCE(sum(amount_toman*effect_sign) FILTER(
        WHERE cost_treatment='deduct_before_profit_split' AND cost_type<>'shipping'
          AND status IN ('finalized','reversed')),0)::bigint online_costs,
      COALESCE(sum(amount_toman*effect_sign) FILTER(
        WHERE cost_treatment='deduct_before_profit_split' AND cost_type='shipping'
          AND status IN ('finalized','reversed')),0)::bigint shipping_cost
      FROM finance.costs WHERE order_id=${orderId}::uuid`.execute(ex);
    const x=r.rows[0];return{onlineCostsToman:Number(x?.online_costs??0),shippingCostToman:Number(x?.shipping_cost??0)};
  }


  async profitRuleById(ex:DatabaseExecutor,id:string,lock=false){
    const r=await sql<any>`SELECT * FROM finance.profit_rules WHERE id=${id}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }

  async listProfitRules(limit=500){
    return (await sql<any>`SELECT * FROM finance.profit_rules
      ORDER BY status,priority DESC,effective_from DESC,id DESC LIMIT ${limit}`.execute(this.db())).rows;
  }

  async createProfitRule(ex:DatabaseExecutor,input:{
    id:string;nameFa:string;scopeType:'global'|'category'|'brand'|'product';scopeId?:string|null;priority:number;
    physicalOwnerPercent:string;onlineOwnerPercent:string;effectiveFrom:Date;effectiveUntil?:Date|null;createdBy?:string|null;
  }){
    const r=await sql<any>`INSERT INTO finance.profit_rules(
      id,name_fa,scope_type,scope_id,priority,physical_owner_percent,online_owner_percent,effective_from,effective_until,status,created_by)
      VALUES(${input.id}::uuid,${input.nameFa},${input.scopeType},${input.scopeId??null}::uuid,${input.priority},
      ${input.physicalOwnerPercent}::numeric,${input.onlineOwnerPercent}::numeric,${input.effectiveFrom},${input.effectiveUntil??null},'draft',
      ${input.createdBy??null}::uuid) RETURNING *`.execute(ex);
    return r.rows[0];
  }

  async updateDraftProfitRule(ex:DatabaseExecutor,id:string,input:{
    nameFa:string;scopeType:'global'|'category'|'brand'|'product';scopeId?:string|null;priority:number;
    physicalOwnerPercent:string;onlineOwnerPercent:string;effectiveFrom:Date;effectiveUntil?:Date|null;
  }){
    const r=await sql<any>`UPDATE finance.profit_rules SET
      name_fa=${input.nameFa},scope_type=${input.scopeType},scope_id=${input.scopeId??null}::uuid,priority=${input.priority},
      physical_owner_percent=${input.physicalOwnerPercent}::numeric,online_owner_percent=${input.onlineOwnerPercent}::numeric,
      effective_from=${input.effectiveFrom},effective_until=${input.effectiveUntil??null},version=version+1,updated_at=now()
      WHERE id=${id}::uuid AND status='draft' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async activateProfitRule(ex:DatabaseExecutor,id:string){
    const r=await sql<any>`UPDATE finance.profit_rules
      SET status='active',activated_at=now(),version=version+1,updated_at=now()
      WHERE id=${id}::uuid AND status='draft' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async expireProfitRule(ex:DatabaseExecutor,id:string,at:Date){
    const r=await sql<any>`UPDATE finance.profit_rules
      SET status='expired',effective_until=LEAST(COALESCE(effective_until,${at}),${at}),expired_at=${at},version=version+1,updated_at=now()
      WHERE id=${id}::uuid AND status='active' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async candidateProfitRules(ex:DatabaseExecutor,ctx:{
    productIds:string[];brandIds:string[];categoryIds:string[];asOf:Date;
  }){
    const productIds=ctx.productIds.length?ctx.productIds:['00000000-0000-0000-0000-000000000000'];
    const brandIds=ctx.brandIds.length?ctx.brandIds:['00000000-0000-0000-0000-000000000000'];
    const categoryIds=ctx.categoryIds.length?ctx.categoryIds:['00000000-0000-0000-0000-000000000000'];
    return (await sql<any>`SELECT r.*,
      CASE r.scope_type WHEN 'product' THEN 4 WHEN 'brand' THEN 3 WHEN 'category' THEN 2 WHEN 'global' THEN 1 ELSE 0 END specificity
      FROM finance.profit_rules r
      WHERE r.status IN ('active','expired')
        AND r.activated_at IS NOT NULL
        AND r.effective_from<=${ctx.asOf}
        AND (r.effective_until IS NULL OR ${ctx.asOf}<r.effective_until)
        AND (
          r.scope_type='global'
          OR (r.scope_type='product' AND r.scope_id=ANY(${sql.raw(`ARRAY[${productIds.map(x=>`'${x}'::uuid`).join(',')}]`)}))
          OR (r.scope_type='brand' AND r.scope_id=ANY(${sql.raw(`ARRAY[${brandIds.map(x=>`'${x}'::uuid`).join(',')}]`)}))
          OR (r.scope_type='category' AND r.scope_id=ANY(${sql.raw(`ARRAY[${categoryIds.map(x=>`'${x}'::uuid`).join(',')}]`)}))
        )
      ORDER BY r.priority DESC,specificity DESC,r.id`.execute(ex)).rows;
  }


  async currentFinalProfit(ex:DatabaseExecutor,orderId:string,lock=false){
    const r=await sql<any>`SELECT * FROM finance.profit_calculations
      WHERE order_id=${orderId}::uuid AND calculation_stage='final' AND is_current
      ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }

  async createFinalProfit(ex:DatabaseExecutor,input:{
    id:string;calculationKey:string;orderId:string;source:any;selectedRuleId:string;
    physicalOwnerPercent:string;onlineOwnerPercent:string;reason:string;sourceFingerprint:string;finalizedBy?:string|null;
  }){
    const s=input.source;
    const r=await sql<any>`INSERT INTO finance.profit_calculations(
      id,calculation_key,order_id,calculation_stage,net_sales_toman,cogs_toman,online_costs_toman,shipping_margin_toman,
      profit_before_distribution_toman,selected_rule_id,physical_owner_percent,online_owner_percent,source_snapshot,is_current,
      reason,source_fingerprint,refund_committed_toman,refund_succeeded_toman,gross_cogs_toman,returned_cogs_toman,
      shipping_revenue_toman,shipping_cost_toman,finalized_at,finalized_by)
      VALUES(${input.id}::uuid,${input.calculationKey}::uuid,${input.orderId}::uuid,'final',${s.netSalesToman},${s.cogsToman},
      ${s.onlineCostsToman},${s.shippingMarginToman},${s.profitBeforeDistributionToman},${input.selectedRuleId}::uuid,
      ${input.physicalOwnerPercent}::numeric,${input.onlineOwnerPercent}::numeric,${JSON.stringify(s.sourceSnapshot)}::jsonb,true,
      ${input.reason},${input.sourceFingerprint},${s.payment.committedRefundToman},${s.payment.succeededRefundToman},
      ${s.cogs.grossCogsToman},${s.cogs.returnedCogsToman},${s.shippingRevenueToman},${s.shippingCostToman},now(),
      ${input.finalizedBy??null}::uuid) RETURNING *`.execute(ex);
    return r.rows[0];
  }

  async markFinalNotCurrent(ex:DatabaseExecutor,id:string){
    const r=await sql<any>`UPDATE finance.profit_calculations SET is_current=false,version=version+1
      WHERE id=${id}::uuid AND calculation_stage='final' AND is_current RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async distributionForCalculation(ex:DatabaseExecutor,calculationId:string,lock=false){
    const r=await sql<any>`SELECT * FROM finance.profit_distributions
      WHERE profit_calculation_id=${calculationId}::uuid AND effect_sign=1
      ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }

  async reversalDistributionFor(ex:DatabaseExecutor,distributionId:string){
    const r=await sql<any>`SELECT * FROM finance.profit_distributions
      WHERE reversal_of_id=${distributionId}::uuid AND effect_sign=-1`.execute(ex);
    return r.rows[0]??null;
  }

  async createDistribution(ex:DatabaseExecutor,input:{
    id:string;profitCalculationId:string;orderId:string;baseToman:number;physicalPercent:string;onlinePercent:string;
    physicalShare:number;onlineShare:number;effectSign:1|-1;reversalOfId?:string|null;
  }){
    const r=await sql<any>`INSERT INTO finance.profit_distributions(
      id,profit_calculation_id,order_id,distributable_base_toman,physical_owner_percent,online_owner_percent,
      physical_owner_share_toman,online_owner_share_toman,status,reversal_of_id,effect_sign)
      VALUES(${input.id}::uuid,${input.profitCalculationId}::uuid,${input.orderId}::uuid,${input.baseToman},
      ${input.physicalPercent}::numeric,${input.onlinePercent}::numeric,${input.physicalShare},${input.onlineShare},
      'finalized',${input.reversalOfId??null}::uuid,${input.effectSign}) RETURNING *`.execute(ex);
    return r.rows[0];
  }

  async markDistributionReversed(ex:DatabaseExecutor,id:string){
    const r=await sql<any>`UPDATE finance.profit_distributions SET status='reversed',reversed_at=now(),version=version+1
      WHERE id=${id}::uuid AND status='finalized' AND effect_sign=1 RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async journalById(ex:DatabaseExecutor,id:string,lock=false){
    const r=await sql<any>`SELECT * FROM finance.journal_entries WHERE id=${id}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }
  async journalLines(ex:DatabaseExecutor,id:string){
    return (await sql<any>`SELECT l.*,a.code account_code,a.name_fa account_name_fa
      FROM finance.journal_lines l JOIN finance.accounts a ON a.id=l.account_id
      WHERE l.journal_entry_id=${id}::uuid ORDER BY l.created_at,l.id`.execute(ex)).rows;
  }
  async reversalFor(ex:DatabaseExecutor,id:string){
    const r=await sql<any>`SELECT * FROM finance.journal_entries WHERE reversal_of_id=${id}::uuid`.execute(ex);return r.rows[0]??null;
  }
  async journalView(ex:DatabaseExecutor,id:string){
    const h=await this.journalById(ex,id,false);if(!h)return null;
    return{...h,lines:await this.journalLines(ex,id)};
  }
  async listJournals(limit=200){
    return (await sql<any>`SELECT * FROM finance.journal_entries ORDER BY occurred_at DESC,id DESC LIMIT ${limit}`.execute(this.db())).rows;
  }
  async createJournal(ex:DatabaseExecutor,input:{id:string;entryNumber:string;description:string;occurredAt:Date;status:'draft'|'posted';reversalOfId?:string|null;sourceType?:string|null;sourceId?:string|null;sourceEventId?:string|null;createdBy?:string|null;postedBy?:string|null}){
    const r=await sql<any>`INSERT INTO finance.journal_entries(id,entry_number,status,description,occurred_at,posted_at,reversal_of_id,source_type,source_id,source_event_id,created_by,posted_by)
      VALUES(${input.id}::uuid,${input.entryNumber},${input.status},${input.description},${input.occurredAt},
        ${input.status==='posted'?new Date():null},${input.reversalOfId??null}::uuid,${input.sourceType??null},${input.sourceId??null}::uuid,
        ${input.sourceEventId??null}::uuid,${input.createdBy??null}::uuid,${input.postedBy??null}::uuid)
      RETURNING *`.execute(ex);return r.rows[0];
  }
  async createJournalLine(ex:DatabaseExecutor,input:{id:string;journalId:string;accountId:string;debitToman:number;creditToman:number;description?:string|null}){
    await sql`INSERT INTO finance.journal_lines(id,journal_entry_id,account_id,debit_toman,credit_toman,description)
      VALUES(${input.id}::uuid,${input.journalId}::uuid,${input.accountId}::uuid,${input.debitToman},${input.creditToman},${input.description??null})`.execute(ex);
  }
  async postJournal(ex:DatabaseExecutor,id:string,postedBy?:string|null){
    const r=await sql<any>`UPDATE finance.journal_entries SET status='posted',posted_at=now(),posted_by=${postedBy??null}::uuid,version=version+1,updated_at=now()
      WHERE id=${id}::uuid AND status='draft' RETURNING *`.execute(ex);return r.rows[0]??null;
  }
  async markReversed(ex:DatabaseExecutor,id:string,reversedBy?:string|null){
    const r=await sql<any>`UPDATE finance.journal_entries SET status='reversed',reversed_at=now(),reversed_by=${reversedBy??null}::uuid,version=version+1,updated_at=now()
      WHERE id=${id}::uuid AND status='posted' RETURNING *`.execute(ex);return r.rows[0]??null;
  }
  async currentProfitView(orderId:string){
    const ex=this.db();
    const final=await this.currentFinalProfit(ex,orderId,false);
    const provisional=await this.profitCurrent(ex,orderId,'provisional',false);
    const estimated=await this.profitCurrent(ex,orderId,'estimated',false);
    const calculation=final??provisional??estimated??null;
    const distribution=final?await this.distributionForCalculation(ex,String(final.id),false):null;
    return{calculation,distribution};
  }
  async listDistributions(limit=200){return (await sql<any>`SELECT * FROM finance.profit_distributions ORDER BY finalized_at DESC,id DESC LIMIT ${limit}`.execute(this.db())).rows;}
  async distributionById(id:string){const r=await sql<any>`SELECT * FROM finance.profit_distributions WHERE id=${id}::uuid`.execute(this.db());if(!r.rows[0])throw new DomainError('FINANCE_DISTRIBUTION_NOT_FOUND','تقسیم سود پیدا نشد.');return r.rows[0];}
  async dashboard(){
    const r=await sql<any>`SELECT
      (SELECT count(*)::int FROM finance.journal_entries WHERE status='draft') draft_journals,
      (SELECT count(*)::int FROM finance.costs WHERE status='draft') draft_costs,
      (SELECT count(*)::int FROM finance.profit_calculations WHERE is_current AND calculation_stage='final') finalized_orders,
      (SELECT COALESCE(sum(distributable_base_toman*effect_sign),0)::bigint FROM finance.profit_distributions) net_distributable_profit_toman,
      (SELECT COALESCE(sum(physical_owner_share_toman*effect_sign),0)::bigint FROM finance.profit_distributions) physical_owner_net_share_toman,
      (SELECT COALESCE(sum(online_owner_share_toman*effect_sign),0)::bigint FROM finance.profit_distributions) online_owner_net_share_toman`.execute(this.db());
    return r.rows[0];
  }
  async profitSummary(){
    const r=await sql<any>`SELECT calculation_stage,count(*)::int calculation_count,
      COALESCE(sum(profit_before_distribution_toman),0)::bigint profit_before_distribution_toman
      FROM finance.profit_calculations WHERE is_current GROUP BY calculation_stage ORDER BY calculation_stage`.execute(this.db());
    return r.rows;
  }


  async runFinanceReport(reportKey:string,p:{from:Date|null;to:Date|null;limit:number}){
    const from=p.from,to=p.to;
    if(reportKey==='finance_summary'){
      const r=await sql<any>`SELECT
        COALESCE(sum(pc.net_sales_toman) FILTER (WHERE pc.is_current AND pc.calculation_stage='final'),0)::bigint net_sales_toman,
        COALESCE(sum(pc.cogs_toman) FILTER (WHERE pc.is_current AND pc.calculation_stage='final'),0)::bigint cogs_toman,
        COALESCE(sum(pc.online_costs_toman) FILTER (WHERE pc.is_current AND pc.calculation_stage='final'),0)::bigint online_costs_toman,
        COALESCE(sum(pc.shipping_margin_toman) FILTER (WHERE pc.is_current AND pc.calculation_stage='final'),0)::bigint shipping_margin_toman,
        COALESCE(sum(pc.profit_before_distribution_toman) FILTER (WHERE pc.is_current AND pc.calculation_stage='final'),0)::bigint profit_before_distribution_toman,
        count(*) FILTER (WHERE pc.is_current AND pc.calculation_stage='final')::int finalized_order_count
        FROM finance.profit_calculations pc
        WHERE (${from}::timestamptz IS NULL OR pc.calculated_at>=${from}) AND (${to}::timestamptz IS NULL OR pc.calculated_at<${to})`.execute(this.db());return r.rows[0];
    }
    if(reportKey==='profit_by_order')return (await sql<any>`SELECT order_id,calculated_at,net_sales_toman,cogs_toman,online_costs_toman,shipping_margin_toman,profit_before_distribution_toman
      FROM finance.profit_calculations WHERE is_current AND calculation_stage='final'
      AND (${from}::timestamptz IS NULL OR calculated_at>=${from}) AND (${to}::timestamptz IS NULL OR calculated_at<${to})
      ORDER BY calculated_at DESC,id DESC LIMIT ${p.limit}`.execute(this.db())).rows;
    if(reportKey==='costs_by_type')return (await sql<any>`SELECT cost_type,cost_treatment,count(*)::int cost_count,
      COALESCE(sum(amount_toman*effect_sign),0)::bigint net_amount_toman
      FROM finance.costs WHERE status IN ('finalized','reversed')
      AND (${from}::timestamptz IS NULL OR occurred_at>=${from}) AND (${to}::timestamptz IS NULL OR occurred_at<${to})
      GROUP BY cost_type,cost_treatment ORDER BY net_amount_toman DESC,cost_type,cost_treatment LIMIT ${p.limit}`.execute(this.db())).rows;
    if(reportKey==='owner_distribution')return (await sql<any>`SELECT date_trunc('day',finalized_at) period,
      COALESCE(sum(distributable_base_toman*effect_sign),0)::bigint distributable_base_toman,
      COALESCE(sum(physical_owner_share_toman*effect_sign),0)::bigint physical_owner_share_toman,
      COALESCE(sum(online_owner_share_toman*effect_sign),0)::bigint online_owner_share_toman
      FROM finance.profit_distributions WHERE (${from}::timestamptz IS NULL OR finalized_at>=${from}) AND (${to}::timestamptz IS NULL OR finalized_at<${to})
      GROUP BY 1 ORDER BY 1 DESC LIMIT ${p.limit}`.execute(this.db())).rows;
    if(reportKey==='journal_trial_balance')return (await sql<any>`SELECT a.code account_code,a.name_fa account_name_fa,a.account_type,
      COALESCE(sum(l.debit_toman),0)::bigint debit_toman,COALESCE(sum(l.credit_toman),0)::bigint credit_toman,
      (COALESCE(sum(l.debit_toman),0)-COALESCE(sum(l.credit_toman),0))::bigint balance_toman
      FROM finance.journal_lines l JOIN finance.journal_entries j ON j.id=l.journal_entry_id JOIN finance.accounts a ON a.id=l.account_id
      WHERE j.status IN ('posted','reversed') AND (${from}::timestamptz IS NULL OR j.occurred_at>=${from}) AND (${to}::timestamptz IS NULL OR j.occurred_at<${to})
      GROUP BY a.id,a.code,a.name_fa,a.account_type ORDER BY a.code LIMIT ${p.limit}`.execute(this.db())).rows;
    throw new DomainError('FINANCE_REPORT_UNSUPPORTED','گزارش مالی پشتیبانی نمی‌شود.');
  }
  async createReportJob(ex:DatabaseExecutor,input:{id:string;reportKey:string;parameters:any;result:any}){
    const r=await sql<any>`INSERT INTO finance.report_jobs(id,report_key,status,parameters,result_json,started_at,completed_at)
      VALUES(${input.id}::uuid,${input.reportKey},'completed',${JSON.stringify(input.parameters)}::jsonb,${JSON.stringify(input.result)}::jsonb,now(),now()) RETURNING *`.execute(ex);return r.rows[0];
  }
  async reportJobById(id:string){const r=await sql<any>`SELECT * FROM finance.report_jobs WHERE id=${id}::uuid`.execute(this.db());if(!r.rows[0])throw new DomainError('FINANCE_REPORT_NOT_FOUND','گزارش مالی پیدا نشد.');return r.rows[0];}
  async cancelReportJob(ex:DatabaseExecutor,id:string,reason:string){
    const r=await sql<any>`UPDATE finance.report_jobs SET status='cancelled',cancelled_at=now(),cancel_reason=${reason},updated_at=now()
      WHERE id=${id}::uuid AND status IN ('queued','running') RETURNING *`.execute(ex);
    if(r.rows[0])return r.rows[0];const current=await sql<any>`SELECT * FROM finance.report_jobs WHERE id=${id}::uuid`.execute(ex);
    if(!current.rows[0])throw new DomainError('FINANCE_REPORT_NOT_FOUND','گزارش مالی پیدا نشد.');
    throw new DomainError('FINANCE_REPORT_NOT_CANCELLABLE','گزارش در وضعیت قابل لغو نیست.');
  }
  async createExport(ex:DatabaseExecutor,input:{id:string;reportJobId:string;format:string;filename:string;mimeType:string;content:string}){
    const r=await sql<any>`INSERT INTO finance.exports(id,report_job_id,status,format,filename,mime_type,content_text,completed_at)
      VALUES(${input.id}::uuid,${input.reportJobId}::uuid,'completed',${input.format},${input.filename},${input.mimeType},${input.content},now()) RETURNING id,report_job_id,status,format,filename,mime_type,created_at,completed_at`.execute(ex);return r.rows[0];
  }
  async exportById(id:string,withContent:boolean){const r=await sql<any>`SELECT id,report_job_id,status,format,filename,mime_type,created_at,completed_at${sql.raw(withContent?',content_text':'')}
    FROM finance.exports WHERE id=${id}::uuid`.execute(this.db());if(!r.rows[0])throw new DomainError('FINANCE_EXPORT_NOT_FOUND','خروجی مالی پیدا نشد.');return r.rows[0];}

}
