from pathlib import Path
import sys,json
root=Path(__file__).resolve().parents[1]
svc=(root/'src/modules/finance/application/profit-calculation.service.ts').read_text()
repo=(root/'src/modules/finance/infrastructure/finance.repository.ts').read_text()
order=(root/'src/modules/orders/application/ports/order-finance.service.ts').read_text()
pay=(root/'src/modules/payments/application/ports/payment-finance.service.ts').read_text()
inv=(root/'src/modules/inventory/application/ports/inventory-finance.service.ts').read_text()
mig=(root/'database/migrations/0022_finance_profit_calculation_hardening.sql').read_text()
mod=(root/'src/modules/finance/finance.module.ts').read_text()
checks={
'profit service':"export class ProfitCalculationService" in svc,
'finance module wired':"ProfitCalculationService" in mod and "OrdersModule" in mod and "PaymentsModule" in mod and "InventoryModule" in mod,
'order port source':"merchandiseRevenueToman:subtotal-discount" in order,
'payment committed refund':"requested','approved','processing','succeeded','unknown" in pay,
'payment succeeded refund':"status='succeeded'" in pay,
'payment unresolved refund':"requested','approved','processing','unknown" in pay,
'inventory gross cogs':"sum(c.quantity*c.unit_cost_toman)" in inv,
'inventory returned cogs lineage':"return_parent_consumption_id" in inv and "received_quantity*cl.effective_unit_cost_toman" in inv,
'returned cogs guard':"FINANCE_RETURNED_COGS_EXCEEDS_GROSS" in inv,
'online costs exclude shipping':"cost_type<>'shipping'" in repo,
'shipping cost separate':"cost_type='shipping'" in repo,
'canonical net sales':"order.merchandiseRevenueToman-payment.committedRefundToman" in svc,
'canonical shipping margin':"shippingRevenueToman-shippingCostToman" in svc,
'canonical profit equation':"netSalesToman-cogsToman-onlineCostsToman+shippingMarginToman" in svc,
'estimated provisional only':"stage:'estimated'|'provisional'" in svc and "calculation_stage='final'" not in svc,
'refund settlement blockers':"committed_refund_not_succeeded" in svc and "payment_unsettled" in svc,
'unresolved refund blocker':"unresolved_refund" in svc,
'source fingerprint':"createHash('sha256')" in svc and "sourceFingerprint" in svc,
'idempotent same snapshot':"source_fingerprint" in svc and "return current" in svc,
'order row lock':"orders.snapshot(ex,orderId,lock)" in svc and "buildFactsInTransaction(ex,orderId,true)" in svc,
'payment row lock':"payments.snapshot(ex,orderId,lock)" in svc and "buildFactsInTransaction(ex,orderId,true)" in svc,
'current calc row lock':"profitCurrent(ex,orderId,f.stage,true)" in svc,
'supersession atomic':"supersedeProfitCalculation" in svc and "supersedesId" in svc,
'profit snapshot immutable db':"FINANCE_PROFIT_SNAPSHOT_IMMUTABLE" in mig,
'final profit immutable db':"FINANCE_FINAL_PROFIT_IMMUTABLE" in mig,
'cogs component db check':"ck_finance_profit_cogs_components" in mig,
'shipping margin db check':"ck_finance_profit_shipping_margin" in mig,
'refund committed db check':"refund_succeeded_toman<=refund_committed_toman" in mig,
'supersession db guard':"FINANCE_PROFIT_SUPERSESSION_INVALID" in mig,
'audit event':"finance.profit.calculate" in svc,
'outbox event':"finance.profit.calculated.v1" in svc,
'closed event schema':json.loads((root/'contracts/events/finance.profit.calculated.v1.schema.json').read_text()).get('additionalProperties') is False,
'no finance HTTP controller':not any((root/'src/modules/finance/presentation').glob('*controller.ts')),
'no distribution engine':not (root/'src/modules/finance/application/profit-distribution.service.ts').exists(),
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
