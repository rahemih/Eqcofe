from pathlib import Path
import re, yaml, sys

root=Path(__file__).resolve().parents[1]
controller=(root/'src/modules/fulfillment/presentation/fulfillment.controller.ts').read_text()
shipment=(root/'src/modules/fulfillment/application/shipment.service.ts').read_text()
repo=(root/'src/modules/fulfillment/infrastructure/fulfillment.repository.ts').read_text()
mig15=(root/'database/migrations/0015_fulfillment_partial_shipment_hardening.sql').read_text()
openapi=yaml.safe_load((root/'contracts/http/openapi.yaml').read_text())

checks=[]
def ok(name,cond):
    checks.append((name,bool(cond)))
    print(('PASS ' if cond else 'FAIL ')+name)

expected=[
('GET','admin/fulfillment/orders'),
('GET','admin/fulfillment/orders/:order_id'),
('POST','admin/fulfillment/orders/:order_id/allocate'),
('POST','admin/fulfillment/orders/:order_id/start-preparation'),
('POST','admin/fulfillment/allocations/:id/pick'),
('POST','admin/fulfillment/allocations/:id/unpick'),
('POST','admin/shipments'),
('GET','admin/shipments'),
('GET','admin/shipments/:id'),
('POST','admin/shipments/:id/mark-ready'),
('POST','admin/shipments/:id/handover'),
('POST','admin/shipments/:id/cancel'),
('POST','admin/shipments/:id/refresh-tracking'),
('POST','webhooks/shipping/:provider_key'),
]
for method,path in expected:
    dec='@'+('Get' if method=='GET' else 'Post')+f"('{path}')"
    ok(f'controller {method} {path}',dec in controller)

ok('staff guard present',controller.count('@StaffOnly()')>=13)
ok('webhook public', "@Public() @HttpCode(HttpStatus.OK) @Post('webhooks/shipping/:provider_key')" in controller)
ok('handover step-up',"@RequireStepUp() @RequireIdempotency('shipment.handover')" in controller)
ok('cancel step-up',"@RequireStepUp() @RequireIdempotency('shipment.cancel')" in controller)
ok('idempotency allocate',"@RequireIdempotency('fulfillment.allocate')" in controller)
ok('idempotency shipment create',"@RequireIdempotency('shipment.create')" in controller)
ok('raw-body fail closed',"SHIPPING_WEBHOOK_RAW_BODY_REQUIRED" in shipment)
ok('webhook conflict guard',"SHIPPING_WEBHOOK_EVENT_CONFLICT" in shipment)
ok('provider registry fail closed',"SHIPPING_PROVIDER_NOT_CONFIGURED" in (root/'src/modules/fulfillment/application/ports/shipping-provider.registry.ts').read_text())
ok('partial shipment migration exists',"FULFILLMENT_PARTIAL_SHIPMENT_CANNOT_CLOSE_ALLOCATION" in mig15)
ok('shipment candidate row lock',"FOR UPDATE OF fp" in repo)
ok('shipment create deterministic sort',"sort((a,b)=>a.order_item_id.localeCompare(b.order_item_id))" in shipment)
ok('handover deterministic allocation order',"sort(([a],[b])=>a.localeCompare(b))" in shipment)

paths={k:v for k,v in openapi['paths'].items() if k.startswith('/admin/fulfillment') or k.startswith('/admin/shipments') or k.startswith('/webhooks/shipping')}
ok('openapi fulfillment/shipping path count',len(paths)==13)
ops=sum(1 for v in paths.values() for m in v if m in {'get','post','put','patch','delete'})
ok('openapi fulfillment/shipping operation count',ops==14)

failed=[n for n,c in checks if not c]
print(f'{sum(c for _,c in checks)}/{len(checks)} PASS')
sys.exit(1 if failed else 0)
