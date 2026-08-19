from pathlib import Path
checks=[]
def ck(name,cond): checks.append((name,bool(cond)))
root=Path('.')
c=(root/'src/modules/finance/presentation/finance.controller.ts').read_text()
fm=(root/'src/modules/finance/finance.module.ts').read_text()
r=(root/'src/modules/finance/infrastructure/finance.repository.ts').read_text()
o=(root/'contracts/http/openapi.yaml').read_text()
ck('finance controller exists','class FinanceController' in c)
ck('controller registered','controllers:[FinanceController]' in fm)
for route in ['admin/finance/dashboard','admin/finance/accounts','admin/finance/journals','admin/finance/costs','admin/finance/orders/:order_id/profit','admin/finance/profit-rules','admin/finance/profit-distributions']:
    ck('route '+route,route in c)
for perm in ['finance.view','finance.accounts.manage','finance.journal.create','finance.journal.post','finance.journal.reverse','finance.cost.manage','finance.cost.finalize','finance.cost.reverse','finance.profit.recalculate','finance.profit.finalize','finance.profit_rule.manage']:
    ck('permission '+perm,perm in c)
for scope in ['finance.account.create','finance.journal.create','finance.journal.post','finance.journal.reverse','finance.cost.create','finance.cost.finalize','finance.cost.reverse','finance.profit.recalculate','finance.profit.finalize','finance.profit.reverse','finance.profit_rule.create','finance.profit_rule.activate','finance.profit_rule.expire']:
    ck('idempotency '+scope,scope in c)
for op in ['postJournal','reverseJournal','finalizeCost','reverseCost','recalculate','finalizeProfit','reverseProfit','activateRule','expireRule']:
    idx=c.find(op+'('); ck('stepup '+op,idx>0 and '@RequireStepUp()' in c[max(0,idx-300):idx])
ck('dashboard repository query','async dashboard()' in r)
ck('profit summary repository query','async profitSummary()' in r)
ck('distribution queries','async listDistributions' in r and 'async distributionById' in r)
ck('signed money openapi','SignedMoneyToman:' in o)
ck('profit rule scope openapi','scope_type:' in o[o.find('ProfitRuleRequest:'):o.find('JournalLineInput:')])
ck('profit rule priority openapi','priority:' in o[o.find('ProfitRuleRequest:'):o.find('JournalLineInput:')])
ck('journal exclusive side openapi','oneOf:' in o[o.find('JournalLineInput:'):o.find('JournalCreateRequest:')])
ck('profit reverse contract','/admin/finance/orders/{order_id}/profit/reverse:' in o)
ck('account get contract','operationId: getAdminFinanceAccountsId' in o)
failed=[n for n,v in checks if not v]
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
print(f'{len(checks)-len(failed)}/{len(checks)} PASS')
if failed: raise SystemExit(1)
