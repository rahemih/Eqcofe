from pathlib import Path
import yaml,sys,re
root=Path(__file__).resolve().parents[1]
ret=(root/'src/modules/returns/application/returns.service.ts').read_text()
war=(root/'src/modules/warranty/application/warranty.service.ts').read_text()
integ=(root/'src/modules/after-sales/application/after-sales-integration.service.ts').read_text()
pay=(root/'src/modules/payments/application/ports/payment-after-sales.service.ts').read_text()
inv=(root/'src/modules/inventory/application/ports/inventory-after-sales.service.ts').read_text()
mig=(root/'database/migrations/0017_after_sales_resolution_engine.sql').read_text()
doc=yaml.safe_load((root/'contracts/http/openapi.yaml').read_text())
checks={
'return resolve active':"async resolve(id:string,input:" in ret and "RETURN_RESOLUTION_ENGINE_NOT_READY" not in ret,
'warranty resolve active':"async resolve(id:string,input:" in war and "WARRANTY_RESOLUTION_ENGINE_NOT_READY" not in war,
'return inspecting only':"h.status)!=='inspecting'" in ret,
'warranty received or repairing only':"['received','repairing']" in war,
'return complete action set':"RETURN_RESOLUTION_INCOMPLETE" in ret,
'return received quantity drives action':"const qty=Number(ri.received_quantity)" in ret,
'refund item cap return':"RETURN_REFUND_LINE_CAP_EXCEEDED" in ret,
'refund item cap warranty':"WARRANTY_REFUND_LINE_CAP_EXCEEDED" in war,
'payment cap still enforced':"REFUND_CAP_EXCEEDED" in pay and "payments.assert_refund_cap" in pay,
'restock via inventory port':"receiveReturnInTransaction" in ret,
'restock exact cost lineage':"return_parent_consumption_id" in inv and "already_returned" in inv,
'replacement queue unique source':"UNIQUE(source_type,source_id)" in mig,
'replacement lineage trigger':"AFTER_SALES_REPLACEMENT_LINEAGE_MISMATCH" in mig,
'return resolution db linkage':"RETURN_REPLACEMENT_LINK_REQUIRED" in mig and "RETURN_REFUND_LINK_REQUIRED" in mig,
'warranty resolution db linkage':"WARRANTY_REPLACEMENT_LINK_REQUIRED" in mig and "WARRANTY_REFUND_LINK_REQUIRED" in mig,
'returns no direct payment sql':"sql`" not in ret and "from 'kysely'" not in ret,
'returns no direct inventory sql':"from 'kysely'" not in ret,
'warranty no direct payment sql':"sql`" not in war and "from 'kysely'" not in war,
'warranty no direct inventory sql':"from 'kysely'" not in war,
'openapi return action schema':'ReturnResolutionItemRequest' in doc['components']['schemas'],
'openapi warranty action schema':'WarrantyResolutionActionRequest' in doc['components']['schemas'],
'warranty quantity explicit':'quantity' in doc['components']['schemas']['WarrantyResolutionActionRequest']['properties'],
'global integration module':"@Global()" in (root/'src/modules/after-sales/after-sales.module.ts').read_text(),
'order financial bounds':"lineTotalToman" in (root/'src/modules/orders/application/ports/order-after-sales.port.ts').read_text(),
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
