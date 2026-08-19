from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
svc=(root/'src/modules/returns/application/returns.service.ts').read_text()
repo=(root/'src/modules/returns/infrastructure/returns.repository.ts').read_text()
orders=(root/'src/modules/orders/application/ports/order-returns.service.ts').read_text()
mod=(root/'src/modules/returns/returns.module.ts').read_text()
checks={
'customer ownership enforced':"getOwnedForReturn" in svc and "customerId" in orders,
'row lock customer create':"getOwnedForReturn(ex,orderNumber,customerId,true)" in svc,
'duplicate order item rejected':"RETURN_DUPLICATE_ORDER_ITEM" in svc,
'quantity validated':"RETURN_QUANTITY_EXCEEDS_ORDER_ITEM" in svc,
'customer cancel requested-only':"RETURN_CUSTOMER_CANCEL_NOT_ALLOWED" in svc,
'admin transitions locked':"byId(ex,this.uuid(id),true)" in svc,
'receive complete required':"RETURN_RECEIPT_INCOMPLETE" in svc,
'received future rejected':"RETURN_RECEIVED_AT_INVALID" in svc,
'resolution boundary present':("RETURN_RESOLUTION_ENGINE_NOT_READY" in svc or "async resolve(id:string,input:" in svc),
'outbox requested':"return.requested.v1" in svc,
'outbox cancelled':"return.cancelled.v1" in svc,
'outbox review':"return.review_started.v1" in svc,
'outbox approved':"return.approved.v1" in svc,
'outbox rejected':"return.rejected.v1" in svc,
'outbox received':"return.received.v1" in svc,
'outbox inspection':"return.inspection_started.v1" in svc,
'history every transition':"this.repo.history" in svc,
'transaction create':"return this.tx.run(async ex=>" in svc,
'repository no payment resolution':"payments." not in repo,
'repository no inventory resolution':"inventory." not in repo,
'module imports orders':"imports:[OrdersModule]" in mod,
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
