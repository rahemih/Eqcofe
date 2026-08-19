from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
svc=(root/'src/modules/warranty/application/warranty.service.ts').read_text()
repo=(root/'src/modules/warranty/infrastructure/warranty.repository.ts').read_text()
order=(root/'src/modules/orders/application/ports/order-warranty.service.ts').read_text()
mod=(root/'src/modules/warranty/warranty.module.ts').read_text()
checks={
'ownership port':"getOwnedItemForWarranty" in svc and "customerId" in order,
'row lock create':"getOwnedItemForWarranty(ex,orderItemId,customerId,true)" in svc,
'preferred resolution whitelist':"repair','replacement','refund','inspection" in svc,
'order eligibility':"WARRANTY_ORDER_NOT_ELIGIBLE" in svc,
'create outbox':"warranty.claim_requested.v1" in svc,
'review outbox':"warranty.review_started.v1" in svc,
'approve outbox':"warranty.approved.v1" in svc,
'reject outbox':"warranty.rejected.v1" in svc,
'receive outbox':"warranty.received.v1" in svc,
'repair outbox':"warranty.repair_started.v1" in svc,
'close outbox':"warranty.closed.v1" in svc,
'receive future blocked':"WARRANTY_RECEIVED_AT_INVALID" in svc,
'resolution boundary present':("WARRANTY_RESOLUTION_ENGINE_NOT_READY" in svc or "async resolve(id:string,input:" in svc),
'close resolved only':"h.status)!=='resolved'" in svc,
'all mutations transactional':svc.count("this.tx.run(async ex=>")>=4,
'history persisted':"this.repo.history" in svc,
'repository no payment orchestration':"payments." not in repo,
'repository no inventory orchestration':"inventory." not in repo,
'module imports orders':"imports:[OrdersModule]" in mod,
}
for k,v in checks.items(): print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
