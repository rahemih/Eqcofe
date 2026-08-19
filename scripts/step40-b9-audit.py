from pathlib import Path
import re,json,yaml,sys
root=Path(__file__).resolve().parents[1]
ret=(root/'src/modules/returns/application/returns.service.ts').read_text()
war=(root/'src/modules/warranty/application/warranty.service.ts').read_text()
rr=(root/'src/modules/returns/infrastructure/returns.repository.ts').read_text()
wr=(root/'src/modules/warranty/infrastructure/warranty.repository.ts').read_text()
consumer=(root/'src/modules/notifications/application/after-sales-notification.consumer.ts').read_text()
integ=(root/'src/modules/after-sales/application/after-sales-integration.service.ts').read_text()
worker=(root/'apps/worker/app.module.ts').read_text()
mig=(root/'database/migrations/0018_after_sales_notifications.sql').read_text()
doc=yaml.safe_load((root/'contracts/http/openapi.yaml').read_text())

expected=[
'return.requested.v1','return.review_started.v1','return.approved.v1','return.rejected.v1','return.received.v1','return.inspection_started.v1','return.resolved.v1','return.cancelled.v1',
'warranty.claim_requested.v1','warranty.review_started.v1','warranty.approved.v1','warranty.rejected.v1','warranty.received.v1','warranty.repair_started.v1','warranty.resolved.v1','warranty.closed.v1',
'inventory.return.received.v1','after_sales.replacement.requested.v1']
checks={
'notification table':"CREATE TABLE IF NOT EXISTS notifications.after_sales_notifications" in mig,
'notification event id unique':"event_id uuid NOT NULL UNIQUE" in mig,
'unread index':"WHERE read_at IS NULL" in mig,
'consumer registered':"this.registry.register(this)" in consumer,
'consumer worker loaded':"NotificationsModule" in worker,
'consumer idempotent':"ON CONFLICT(event_id) DO NOTHING" in consumer,
'customer resolved without trusting every payload':"SELECT customer_id FROM returns.returns" in consumer and "SELECT customer_id FROM warranty.claims" in consumer,
'replacement emits event':"after_sales.replacement.requested.v1" in integ,
'return timeline history owned':"FROM returns.status_history" in rr,
'warranty timeline history owned':"FROM warranty.status_history" in wr,
'customer return timeline ownership':"byNumber(this.repo.db(),number,this.customerId()" in ret,
'customer warranty timeline ownership':"byNumber(this.repo.db(),number,this.customerId()" in war,
'openapi four timeline paths':all(p in doc['paths'] for p in [
'/customer/returns/{return_number}/timeline','/admin/returns/{id}/timeline',
'/customer/warranty/claims/{claim_number}/timeline','/admin/warranty/claims/{id}/timeline']),
'all B9 event schemas exist':all((root/'contracts/events'/f'{e}.schema.json').exists() for e in expected),
'all B9 event schemas closed':all(json.loads((root/'contracts/events'/f'{e}.schema.json').read_text()).get('additionalProperties') is False for e in expected),
'no notification ownership of domain state':"UPDATE returns." not in consumer and "UPDATE warranty." not in consumer,
}
for k,v in checks.items():print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
