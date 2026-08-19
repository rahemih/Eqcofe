from pathlib import Path
import sys,json
root=Path(__file__).resolve().parents[1]
svc=(root/'src/modules/finance/application/profit-finalization.service.ts').read_text()
calc=(root/'src/modules/finance/application/profit-calculation.service.ts').read_text()
rules=(root/'src/modules/finance/application/profit-rule.service.ts').read_text()
repo=(root/'src/modules/finance/infrastructure/finance.repository.ts').read_text()
mig=(root/'database/migrations/0024_finance_profit_finalization_distribution.sql').read_text()
ord=(root/'src/modules/orders/application/ports/order-finance.service.ts').read_text()
mod=(root/'src/modules/finance/finance.module.ts').read_text()
events=['finance.profit.finalized.v1','finance.profit_distribution.finalized.v1',
        'finance.profit_distribution.reversal_finalized.v1','finance.profit.reversed.v1']
checks={
'finalization service':"export class ProfitFinalizationService" in svc,
'finance module wired':"ProfitFinalizationService" in mod,
'fresh authoritative facts':"buildFactsInTransaction(ex,orderId,true)" in svc,
'payment settled required':"FINANCE_PAYMENT_NOT_SETTLED" in svc,
'unresolved refund blocked':"FINANCE_REFUND_UNRESOLVED" in svc,
'committed refund fully settled':"FINANCE_REFUND_NOT_SETTLED" in svc,
'draft costs block finalization':"FINANCE_DRAFT_COSTS_EXIST" in svc and "draftOrderCostCount" in repo,
'provisional snapshot required':"FINANCE_PROVISIONAL_PROFIT_REQUIRED" in svc,
'stale provisional blocked':"FINANCE_PROVISIONAL_PROFIT_STALE" in svc,
'historical rule at order time':"fresh.order.createdAt" in svc and "createdAt:new Date(x.created_at)" in ord,
'historical committed rules eligible':"r.status IN ('active','expired')" in repo,
'draft rules excluded historically':"r.status IN ('active','expired')" in repo and "activated_at IS NOT NULL" in repo,
'mixed basket fail closed':"FINANCE_PROFIT_RULE_MIXED_ORDER_UNSUPPORTED" in rules,
'selected rule snapshot':"selected_rule_id" in calc or "selected_rule_id" in svc,
'percent snapshot':"physical_owner_percent" in svc and "online_owner_percent" in svc,
'final calculation persisted':"createFinalProfit" in svc and "calculation_stage='final'" in repo,
'one current final lock':"currentFinalProfit(ex,orderId,true)" in svc,
'idempotent existing final':"idempotent:true" in svc,
'distribution from exact split':"rules.split" in svc and "createDistribution" in svc,
'distribution exact DB invariant':"physical_owner_share_toman+online_owner_share_toman=distributable_base_toman" in (root/'database/migrations/0019_finance_core.sql').read_text(),
'positive distribution unique':"uq_finance_distribution_positive_calculation" in mig,
'final immutable':"FINANCE_FINAL_PROFIT_IMMUTABLE" in mig,
'final metadata-only deactivation allowed':"OLD.calculation_stage='final'" in mig and "RETURN NEW" in mig,
'distribution immutable':"FINANCE_DISTRIBUTION_IMMUTABLE" in mig,
'distribution delete blocked':"TG_OP='DELETE'" in mig,
'reversal negative exact snapshot':"FINANCE_DISTRIBUTION_REVERSAL_SNAPSHOT_MISMATCH" in mig,
'reversal record required':"FINANCE_DISTRIBUTION_REVERSAL_RECORD_REQUIRED" in mig,
'reversal duplicate guard':"FINANCE_DISTRIBUTION_ALREADY_REVERSED" in svc,
'reversal deactivates final':"markFinalNotCurrent" in svc,
'audit finalize reverse':"finance.profit.finalize" in svc and "finance.profit.reverse" in svc,
'outbox final events':all(x in svc for x in ['finance.profit.finalized.v1','finance.profit_distribution.finalized.v1',
    'finance.profit_distribution.reversal_finalized.v1','finance.profit.reversed.v1']),
'all event schemas exist':all((root/'contracts/events'/f'{e}.schema.json').exists() for e in events),
'all event schemas closed':all(json.loads((root/'contracts/events'/f'{e}.schema.json').read_text()).get('additionalProperties') is False for e in events),
'no finance HTTP controller':not any((root/'src/modules/finance/presentation').glob('*controller.ts')),
}
for k,v in checks.items(): print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
