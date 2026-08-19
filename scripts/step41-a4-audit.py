from pathlib import Path
import sys,json,re
root=Path(__file__).resolve().parents[1]
svc=(root/'src/modules/finance/application/journal.service.ts').read_text()
coa=(root/'src/modules/finance/application/chart-of-accounts.service.ts').read_text()
repo=(root/'src/modules/finance/infrastructure/finance.repository.ts').read_text()
m=(root/'database/migrations/0020_finance_journal_hardening.sql').read_text()
mod=(root/'src/modules/finance/finance.module.ts').read_text()
events=['finance.account.created.v1','finance.account.updated.v1','finance.journal.created.v1','finance.journal.posted.v1','finance.journal.reversal_posted.v1','finance.journal.reversed.v1']
checks={
'coa service':"export class ChartOfAccountsService" in coa,
'journal service':"export class JournalService" in svc,
'finance repository':"export class FinanceRepository" in repo,
'finance module providers':all(x in mod for x in ['FinanceRepository','ChartOfAccountsService','JournalService']),
'account create transactional':"this.tx.run(async ex=>" in coa,
'account code duplicate guard':"FINANCE_ACCOUNT_CODE_EXISTS" in coa,
'account parent guard':"FINANCE_PARENT_ACCOUNT_NOT_FOUND" in coa,
'account audit':"finance.account.create" in coa and "finance.account.update" in coa,
'journal min 2 lines':"lines.length<2" in svc,
'journal debit credit xor':"FINANCE_JOURNAL_LINE_SIDE_INVALID" in svc,
'journal service balance':"FINANCE_JOURNAL_UNBALANCED" in svc,
'journal safe integer money':"Number.isSafeInteger" in svc,
'journal account postable':"FINANCE_JOURNAL_ACCOUNT_NOT_POSTABLE" in svc,
'post requires draft':"FINANCE_JOURNAL_NOT_DRAFT" in svc,
'post row lock':"journalById(ex,id,true)" in svc,
'reversal requires posted':"FINANCE_JOURNAL_NOT_POSTED" in svc,
'reversal duplicate guard':"FINANCE_JOURNAL_ALREADY_REVERSED" in svc,
'reversal draft then post':"status:'draft',reversalOfId:id" in svc and "postJournal(ex,reversalId" in svc,
'reversal swaps debit credit':"debitToman:Number(l.credit_toman),creditToman:Number(l.debit_toman)" in svc,
'journal audit create post reverse':all(x in svc for x in ['finance.journal.create','finance.journal.post','finance.journal.reverse']),
'journal outbox create post reverse':all(x in svc for x in ['finance.journal.created.v1','finance.journal.posted.v1','finance.journal.reversed.v1']),
'account cycle db guard':"FINANCE_ACCOUNT_HIERARCHY_CYCLE" in m,
'posted account guard db':"FINANCE_JOURNAL_ACCOUNT_NOT_POSTABLE" in m,
'line insert blocked after posted':"BEFORE INSERT OR UPDATE OR DELETE" in m,
'posted header immutable':"FINANCE_POSTED_JOURNAL_HEADER_IMMUTABLE" in m,
'reversed header immutable':"FINANCE_REVERSED_JOURNAL_IMMUTABLE" in m,
'reversal linkage db guard':"FINANCE_JOURNAL_REVERSAL_LINK_REQUIRED" in m,
'all event schemas exist':all((root/'contracts/events'/f'{e}.schema.json').exists() for e in events),
'all event schemas closed':all(json.loads((root/'contracts/events'/f'{e}.schema.json').read_text()).get('additionalProperties') is False for e in events),
'no finance http controller yet':not any((root/'src/modules/finance/presentation').glob('*controller.ts')),
}
for k,v in checks.items(): print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
