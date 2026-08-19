from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
m=(root/'database/migrations/0019_finance_core.sql').read_text()
checks={
'finance schema':"CREATE SCHEMA IF NOT EXISTS finance" in m,
'accounts table':"CREATE TABLE IF NOT EXISTS finance.accounts" in m,
'journal header':"CREATE TABLE IF NOT EXISTS finance.journal_entries" in m,
'journal lines':"CREATE TABLE IF NOT EXISTS finance.journal_lines" in m,
'journal balanced guard':"FINANCE_JOURNAL_UNBALANCED" in m,
'journal minimum lines':"FINANCE_JOURNAL_MIN_LINES" in m,
'journal line debit-credit exclusivity':"debit_toman>0 AND credit_toman=0" in m,
'posted journal immutable':"FINANCE_POSTED_JOURNAL_IMMUTABLE" in m,
'costs table':"CREATE TABLE IF NOT EXISTS finance.costs" in m,
'cost treatment four modes':all(x in m for x in ['deduct_before_profit_split','capitalized_into_cost','non_distributable_cost','informational_only']),
'cost order-item lineage':"FINANCE_COST_ORDER_ITEM_MISMATCH" in m,
'profit rules table':"CREATE TABLE IF NOT EXISTS finance.profit_rules" in m,
'profit scopes':all(x in m for x in ["'global'","'category'","'brand'","'product'"]),
'profit percent sum 100':"physical_owner_percent+online_owner_percent=100.0000" in m,
'profit rule scope guard':"FINANCE_PROFIT_RULE_SCOPE_NOT_FOUND" in m,
'profit rule ambiguity guard':"FINANCE_PROFIT_RULE_AMBIGUOUS" in m,
'profit calculations':"CREATE TABLE IF NOT EXISTS finance.profit_calculations" in m,
'signed net sales':"net_sales_toman bigint NOT NULL" in m and "net_sales_toman bigint NOT NULL CHECK" not in m,
'signed shipping margin':"shipping_margin_toman bigint NOT NULL" in m,
'signed profit':"profit_before_distribution_toman bigint NOT NULL" in m,
'canonical profit equation':"profit_before_distribution_toman=net_sales_toman-cogs_toman-online_costs_toman+shipping_margin_toman" in m,
'one current calc per stage':"uq_finance_profit_current_stage" in m,
'final rule snapshot required':"calculation_stage='final'" in m and "selected_rule_id IS NOT NULL" in m,
'profit distributions':"CREATE TABLE IF NOT EXISTS finance.profit_distributions" in m,
'distribution sum exact':"physical_owner_share_toman+online_owner_share_toman=distributable_base_toman" in m,
'distribution lineage guard':"FINANCE_DISTRIBUTION_SNAPSHOT_MISMATCH" in m,
'idempotency ledger':"CREATE TABLE IF NOT EXISTS finance.source_applications" in m,
'event effect uniqueness':"UNIQUE(source_system,source_event_id,effect_type)" in m,
'finance permissions':m.count("('finance.")>=13,
'transaction wrapper':m.lstrip().startswith("BEGIN;") and m.rstrip().endswith("COMMIT;"),
}
for k,v in checks.items(): print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
