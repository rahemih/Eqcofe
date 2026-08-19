from pathlib import Path
import sys,json
root=Path(__file__).resolve().parents[1]
svc=(root/'src/modules/finance/application/profit-rule.service.ts').read_text()
repo=(root/'src/modules/finance/infrastructure/finance.repository.ts').read_text()
ord=(root/'src/modules/orders/application/ports/order-finance.service.ts').read_text()
mig=(root/'database/migrations/0023_finance_profit_rules_hardening.sql').read_text()
mod=(root/'src/modules/finance/finance.module.ts').read_text()
events=['finance.profit_rule.created.v1','finance.profit_rule.updated.v1','finance.profit_rule.activated.v1','finance.profit_rule.expired.v1']
checks={
'profit rule service':"export class ProfitRuleService" in svc,
'finance module wired':"ProfitRuleService" in mod,
'four scope types':all(x in svc for x in ["'global'","'category'","'brand'","'product'"]),
'global scope id forbidden':"FINANCE_PROFIT_RULE_GLOBAL_SCOPE_ID_FORBIDDEN" in svc,
'percent precision parser':r"^\d{1,3}(?:\.\d{1,4})?$" in svc,
'percent exact 100':"physicalUnits+onlineUnits!==1000000" in svc,
'priority bounded':"n<-1000000||n>1000000" in svc,
'draft lifecycle create':"status:'draft'" in svc and "SET DEFAULT 'draft'" in mig,
'draft only update':"FINANCE_PROFIT_RULE_NOT_DRAFT" in svc,
'activate transition':"activateProfitRule" in svc and "status='active'" in repo,
'expire transition':"expireProfitRule" in svc and "status='expired'" in repo,
'active immutable db':"FINANCE_COMMITTED_PROFIT_RULE_IMMUTABLE" in mig,
'expired immutable db':"FINANCE_EXPIRED_PROFIT_RULE_IMMUTABLE" in mig,
'delete committed blocked':"TG_OP='DELETE'" in mig,
'lifecycle db check':"ck_finance_profit_rule_lifecycle" in mig,
'priority db check':"ck_finance_profit_rule_priority" in mig,
'overlap ambiguity db':"FINANCE_PROFIT_RULE_AMBIGUOUS" in mig,
'order context product':"productId:String(x.product_id)" in ord,
'order context brand':"brandId:x.brand_id" in ord,
'order context all categories':"catalog.product_categories" in ord and "primary_category_id" in ord,
'candidate committed time bounded':("r.status='active'" in repo or "r.status IN ('active','expired')" in repo) and "r.effective_from<=" in repo and "effective_until IS NULL" in repo,
'priority before specificity':"ORDER BY r.priority DESC,specificity DESC" in repo,
'specificity product brand category global':"WHEN 'product' THEN 4 WHEN 'brand' THEN 3 WHEN 'category' THEN 2 WHEN 'global' THEN 1" in repo,
'order ambiguity fail closed':"FINANCE_PROFIT_RULE_ORDER_AMBIGUOUS" in svc,
'mixed-rule basket fail closed':"FINANCE_PROFIT_RULE_MIXED_ORDER_UNSUPPORTED" in svc,
'no rule fail closed':"FINANCE_PROFIT_RULE_NOT_FOUND" in svc,
'largest remainder':"largest_remainder_physical_tie_break" in svc,
'negative base supported':"const sign=base<0?-1n:1n" in svc,
'exact split invariant':"p+o!==base" in svc,
'audit create update activate expire':all(x in svc for x in ['finance.profit_rule.create','finance.profit_rule.update','finance.profit_rule.activate','finance.profit_rule.expire']),
'outbox mutation events':all(x in svc for x in ['finance.profit_rule.created.v1','finance.profit_rule.updated.v1','finance.profit_rule.activated.v1','finance.profit_rule.expired.v1']),
'all event schemas exist':all((root/'contracts/events'/f'{e}.schema.json').exists() for e in events),
'all event schemas closed':all(json.loads((root/'contracts/events'/f'{e}.schema.json').read_text()).get('additionalProperties') is False for e in events),
'no distribution persistence in A7':"profit_distributions" not in svc,
'no finance http controller':not any((root/'src/modules/finance/presentation').glob('*controller.ts')),
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
