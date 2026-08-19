from pathlib import Path
r=Path('.')
checks=[]
def has(p,*n):
 s=(r/p).read_text(); return all(x in s for x in n)
consumer=(r/'src/modules/notifications/application/domain-notification.consumer.ts').read_text()
module=(r/'src/modules/notifications/notifications.module.ts').read_text()
checks += [
('generalized consumer exists',(r/'src/modules/notifications/application/domain-notification.consumer.ts').exists()),
('legacy consumer not registered','AfterSalesNotificationConsumer' not in module),
('order event integration',all(x in consumer for x in ['order.submitted.v1','order.confirmed.v1','order.cancelled.v1','order.expired.v1'])),
('payment event integration',all(x in consumer for x in ['payment.paid.v1','payment.failed.v1','payment.refunded.v1','payment.partially_refunded.v1'])),
('shipment event integration',all(x in consumer for x in ['shipment.ready.v1','shipment.handed_over.v1','shipment.cancelled.v1'])),
('after sales integration',all(x in consumer for x in ['return.requested.v1','warranty.claim_requested.v1','after_sales.replacement.requested.v1'])),
('inventory integration','inventory.availability.changed.v1' in consumer),
('orders public port',(r/'src/modules/orders/application/ports/order-notification-context.port.ts').exists()),
('notifications has no orders SQL','orders.orders' not in consumer),
('admin staff port',(r/'src/modules/admin/application/staff-notification.port.ts').exists()),
('inventory audience permission',"activeWithPermission(trx,'inventory.view')" in consumer),
('inventory in app only',"channels:['in_app']" in consumer),
('customer channels explicit',"channels:['in_app','sms','email']" in consumer),
('guest customer skipped','if(!customerId)return' in consumer),
('event id source identity','source_id:event.event_id' in consumer),
('event id idempotency','event:${event.event_id}' in consumer),
('integration writes on inbox transaction','enqueueFromIntegrationEvent(trx' in consumer),
('system event enqueue method',has(Path('src/modules/notifications/application/notification-command.service.ts'),'enqueueFromIntegrationEvent','actorType:\'system\'')),
('correlation propagated',has(Path('src/modules/notifications/application/notification-command.service.ts'),'correlationId','causationId')),
('staff recipient resolver',has(Path('src/modules/notifications/infrastructure/notification-recipient.adapter.ts'),"type==='staff'",'this.staff.resolve')),
('canonical template seed',(r/'database/migrations/0031_notification_domain_event_templates.sql').exists()),
('seed does not replace active',has(Path('database/migrations/0031_notification_domain_event_templates.sql'),"status='active'",'WHERE NOT EXISTS')),
('after sales generic template','after_sales.update' in (r/'database/migrations/0031_notification_domain_event_templates.sql').read_text()),
('inventory staff template','inventory.availability.changed' in (r/'database/migrations/0031_notification_domain_event_templates.sql').read_text()),
('a8 tests',(r/'test/notification-domain-events-a8.spec.ts').exists()),
]
failed=[n for n,v in checks if not v]
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
print(f'A8 audit: {len(checks)-len(failed)}/{len(checks)} PASS')
raise SystemExit(1 if failed else 0)
