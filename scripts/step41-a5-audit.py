from pathlib import Path
import sys,json
root=Path(__file__).resolve().parents[1]
svc=(root/'src/modules/finance/application/cost-ledger.service.ts').read_text()
repo=(root/'src/modules/finance/infrastructure/finance.repository.ts').read_text()
mig=(root/'database/migrations/0021_finance_cost_ledger_hardening.sql').read_text()
mod=(root/'src/modules/finance/finance.module.ts').read_text()
events=['finance.cost.created.v1','finance.cost.finalized.v1','finance.cost.reversal_finalized.v1','finance.cost.reversed.v1']
checks={
'cost ledger service':"export class CostLedgerService" in svc,
'finance module wired':"CostLedgerService" in mod,
'four treatments':all(x in svc for x in ['deduct_before_profit_split','capitalized_into_cost','non_distributable_cost','informational_only']),
'amount safe integer':"Number.isSafeInteger" in svc,
'future timestamp blocked':"FINANCE_COST_OCCURRED_AT_FUTURE" in svc,
'order item requires order':"FINANCE_COST_ORDER_REQUIRED" in svc,
'campaign/order scope conflict':"FINANCE_COST_SCOPE_CONFLICT" in svc,
'db scope exclusivity':"ck_finance_cost_scope_exclusive" in mig,
'capitalized source required service':"FINANCE_CAPITALIZED_COST_SOURCE_REQUIRED" in svc,
'capitalized source required db':"FINANCE_CAPITALIZED_COST_SOURCE_REQUIRED" in mig,
'noncapitalized source rejected':"FINANCE_CAPITALIZATION_SOURCE_UNEXPECTED" in svc and "FINANCE_CAPITALIZATION_SOURCE_UNEXPECTED" in mig,
'capitalization source unique':"uq_finance_cost_capitalization_source" in mig,
'finalize row lock':"costById(ex,id,true)" in svc,
'finalize draft only':"FINANCE_COST_NOT_DRAFT" in svc,
'finalized immutable':"FINANCE_FINALIZED_COST_IMMUTABLE" in mig and "BEFORE UPDATE OR DELETE" in mig,
'reversed immutable':"FINANCE_REVERSED_COST_IMMUTABLE" in mig,
'reversal only finalized original':"FINANCE_COST_NOT_REVERSIBLE" in svc,
'reversal duplicate guard':"FINANCE_COST_ALREADY_REVERSED" in svc,
'reversal effect negative':"effectSign:-1" in svc,
'reversal same snapshot db':"FINANCE_COST_REVERSAL_SNAPSHOT_MISMATCH" in mig,
'reversal record required db':"FINANCE_COST_REVERSAL_RECORD_REQUIRED" in mig,
'reversal of reversal forbidden':"FINANCE_COST_REVERSAL_OF_REVERSAL_FORBIDDEN" in mig,
'effective net uses sign':"sum(amount_toman*effect_sign)" in repo,
'effective statuses include finalized reversed':"status IN ('finalized','reversed')" in repo,
'audit create finalize reverse':all(x in svc for x in ['finance.cost.create','finance.cost.finalize','finance.cost.reverse']),
'outbox events':all(x in svc for x in ['finance.cost.created.v1','finance.cost.finalized.v1','finance.cost.reversal_finalized.v1','finance.cost.reversed.v1']),
'all event schemas exist':all((root/'contracts/events'/f'{e}.schema.json').exists() for e in events),
'all event schemas closed':all(json.loads((root/'contracts/events'/f'{e}.schema.json').read_text()).get('additionalProperties') is False for e in events),
'no HTTP controller yet':not any((root/'src/modules/finance/presentation').glob('*controller.ts')),
'profit engine boundary future-compatible':((not (root/'src/modules/finance/application/profit-calculation.service.ts').exists()) or 'export class ProfitCalculationService' in (root/'src/modules/finance/application/profit-calculation.service.ts').read_text()),
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
