from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
pay=(root/'src/modules/payments/application/ports/payment-after-sales.service.ts').read_text()
inv=(root/'src/modules/inventory/application/ports/inventory-after-sales.service.ts').read_text()
ful=(root/'src/modules/fulfillment/application/ports/fulfillment-after-sales.service.ts').read_text()
ret=(root/'src/modules/returns/application/returns.service.ts').read_text()
war=(root/'src/modules/warranty/application/warranty.service.ts').read_text()
checks={
'payment settlement lock':'FOR UPDATE OF p' in pay,
'payment refund cap':'REFUND_CAP_EXCEEDED' in pay and 'payments.assert_refund_cap' in pay,
'payment audit':'refund.create.after_sales' in pay,
'payment outbox':'refund.requested.v1' in pay,
'inventory original cost lineage':'return_parent_consumption_id' in inv and 'unit_cost_toman' in inv,
'inventory previous returns subtracted':'already_returned' in inv,
'inventory cost lineage locked':'FOR UPDATE OF c' in inv,
'inventory insufficient lineage fails':'RETURN_COST_LINEAGE_INSUFFICIENT' in inv,
'inventory explicit stock bucket':"['sellable','quarantine','damaged']" in inv,
'inventory stock balance on_hand increases':'on_hand=inventory.stock_balances.on_hand+' in inv,
'fulfillment delivered-only':"s.status='delivered'" in ful,
'fulfillment delivered rows lock':'FOR UPDATE OF s' in ful,
'returns has no cross-domain SQL':"from 'kysely'" not in ret and 'sql`' not in ret,
'warranty has no cross-domain SQL':"from 'kysely'" not in war and 'sql`' not in war,
'payment port exported':'PAYMENT_AFTER_SALES_PORT' in (root/'src/modules/payments/payments.module.ts').read_text(),
'inventory port exported':'INVENTORY_AFTER_SALES_PORT' in (root/'src/modules/inventory/inventory.module.ts').read_text(),
'fulfillment port exported':'FULFILLMENT_AFTER_SALES_PORT' in (root/'src/modules/fulfillment/fulfillment.module.ts').read_text(),
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
