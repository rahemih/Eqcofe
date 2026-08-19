from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks=[]
def ok(name,cond):
    checks.append((name,bool(cond)))
svc=(root/'src/modules/fulfillment/application/fulfillment.service.ts').read_text()
inv=(root/'src/modules/inventory/application/ports/inventory-fulfillment.service.ts').read_text()
imod=(root/'src/modules/inventory/inventory.module.ts').read_text()
omod=(root/'src/modules/orders/orders.module.ts').read_text()
fmod=(root/'src/modules/fulfillment/fulfillment.module.ts').read_text()
ok('auto allocation enabled','FULFILLMENT_AUTO_ALLOCATION_NOT_IMPLEMENTED' not in svc and 'planSingleWarehousePreferred' in svc)
ok('fulfillment consumes inventory-owned port',"../../inventory/application/ports/inventory-fulfillment.port" in svc)
ok('fulfillment consumes order-owned port',"../../orders/application/ports/order-fulfillment.port" in svc)
ok('inventory adapter transaction-aware','this.tx.run' not in inv and 'DatabaseExecutor' in inv)
ok('reservation required','FULFILLMENT_RESERVATION_REQUIRED' in inv and 'RESERVATION_NOT_CONVERTIBLE' in inv)
ok('active allocation accounted','allocationsForOrderItems' in inv)
ok('inventory token exported','INVENTORY_FULFILLMENT_PORT' in imod and 'exports:' in imod)
ok('order token exported','ORDER_FULFILLMENT_PORT' in omod and 'exports:' in omod)
ok('fulfillment service activated','FulfillmentService' in fmod and 'InventoryModule' in fmod and 'OrdersModule' in fmod)
ok('no reverse fulfillment port imports',not any('fulfillment/application/ports/fulfillment-' in p.read_text() for p in (root/'src/modules').rglob('*.ts')))
failed=[n for n,v in checks if not v]
print(f'Step39 A5 audit: {len(checks)-len(failed)}/{len(checks)} PASS')
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
raise SystemExit(1 if failed else 0)
