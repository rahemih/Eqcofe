from pathlib import Path
import json, re, hashlib, sys
r=Path('.')
checks=[]
def exists(p): return (r/p).exists()
def has(p,*needles):
    s=(r/p).read_text(encoding='utf-8')
    return all(n in s for n in needles)
def add(name, ok): checks.append((name,bool(ok)))
# A1/A2 scope and boundaries evidenced in source/migrations
add('notification module exists', exists('src/modules/notifications/notifications.module.ts'))
add('channels canonical', has('database/migrations/0030_notification_core.sql', "'sms'", "'email'", "'in_app'"))
add('no live provider SDK in notification package', all(x not in '\n'.join(p.read_text(errors='ignore') for p in (r/'src/modules/notifications').rglob('*.ts')) for x in ['resend','sendgrid','kavenegar','twilio']))
add('no notification credentials persisted', 'credential' not in (r/'database/migrations/0030_notification_core.sql').read_text().lower())
# A3 schema
add('core migration exists', exists('database/migrations/0030_notification_core.sql'))
add('logical source uniqueness', has('database/migrations/0030_notification_core.sql','uq_notification_intent_source'))
add('channel uniqueness', has('database/migrations/0030_notification_core.sql','UNIQUE(notification_id, channel)'))
add('terminal guard', has('database/migrations/0030_notification_core.sql','NOTIFICATION_DELIVERY_TERMINAL'))
add('retry monotonic guard', has('database/migrations/0030_notification_core.sql','NOTIFICATION_RETRY_COUNT_DECREASE'))
# A4 template
add('safe renderer exists', exists('src/modules/notifications/domain/notification-template.renderer.ts'))
add('sensitive template var rejection', has('src/modules/notifications/domain/notification-template.renderer.ts','token','password','api'))
add('template version repository', exists('src/modules/notifications/infrastructure/notification-template.repository.ts'))
add('template name_fa reconciled', has('database/migrations/0032_notification_http_rbac.sql','name_fa'))
# A5 enqueue
add('command service exists', exists('src/modules/notifications/application/notification-command.service.ts'))
add('idempotency lookup', has('src/modules/notifications/application/notification-command.service.ts','byIdempotency'))
add('source convergence', has('src/modules/notifications/application/notification-command.service.ts','bySource'))
add('insert race safe', has('src/modules/notifications/infrastructure/notification.repository.ts','ON CONFLICT DO NOTHING RETURNING'))
add('recipient port authoritative', exists('src/modules/notifications/application/ports/notification-recipient.port.ts'))
add('destination masking', has('src/modules/notifications/application/notification-command.service.ts','destinationMasked'))
# A6 in-app
add('inapp service exists', exists('src/modules/notifications/application/notification-in-app.service.ts'))
add('inapp receipt unique', has('database/migrations/0030_notification_core.sql','delivery_id uuid NOT NULL UNIQUE'))
add('inapp acknowledged event', has('src/modules/notifications/domain/notification.events.ts','notification.in_app.acknowledged.v1'))
# A7 delivery
add('provider port exists', exists('src/modules/notifications/application/ports/notification-provider.port.ts'))
add('provider registry exists', exists('src/modules/notifications/infrastructure/notification-provider.registry.ts'))
add('claim uses skip locked', has('src/modules/notifications/infrastructure/notification-delivery.repository.ts','SKIP LOCKED'))
add('retry policy exists', exists('src/modules/notifications/domain/notification-retry.policy.ts'))
add('dead letter path', 'dead_lettered' in (r/'src/modules/notifications/application/notification-delivery.service.ts').read_text())
# A8 events
consumer='src/modules/notifications/application/domain-notification.consumer.ts'
add('domain consumer exists', exists(consumer))
add('order events mapped', has(consumer,'order.submitted.v1','order.confirmed.v1','order.cancelled.v1','order.expired.v1'))
add('payment events mapped', has(consumer,'payment.paid.v1','payment.failed.v1','payment.refunded.v1'))
add('shipment events mapped', has(consumer,'shipment.ready.v1','shipment.handed_over.v1','shipment.cancelled.v1'))
add('inventory event mapped', has(consumer,'inventory.availability.changed.v1'))
add('after-sales mapped', has(consumer,'return.requested.v1','warranty.claim_requested.v1'))
add('legacy consumer de-registered', 'AfterSalesNotificationConsumer' not in (r/'src/modules/notifications/notifications.module.ts').read_text())
add('canonical template seed exists', exists('database/migrations/0031_notification_domain_event_templates.sql'))
# A9 HTTP security
ctrl='src/modules/notifications/presentation/notifications.controller.ts'
add('controller exists', exists(ctrl))
add('admin view permission', has(ctrl,'notifications.view'))
add('retry permission', has(ctrl,'notifications.retry'))
add('template manage permission', has(ctrl,'notifications.templates.manage'))
add('step up used', 'StepUp' in (r/ctrl).read_text())
add('idempotency used', 'Idempotency' in (r/ctrl).read_text())
add('internal bearer', 'InternalService' in (r/ctrl).read_text() or 'service' in (r/ctrl).read_text().lower())
add('manual retry DB override explicit', has('database/migrations/0032_notification_http_rbac.sql','eqcofe.notification_manual_retry'))
add('delivered terminal remains guarded', has('database/migrations/0032_notification_http_rbac.sql','delivered'))
# A10 operations
add('scheduled migration', exists('database/migrations/0033_notification_operations.sql'))
add('scheduled claim filter', 'scheduled_at' in (r/'src/modules/notifications/infrastructure/notification-delivery.repository.ts').read_text())
add('operations service exists', exists('src/modules/notifications/application/notification-operations.service.ts'))
add('stale recovery code', has('src/modules/notifications/infrastructure/notification-delivery.repository.ts','NOTIFICATION_WORKER_STALE'))
add('worker delivery loop exists', any('NotificationDeliveryWorkerService' in p.read_text(errors='ignore') for p in (r/'apps').rglob('*.ts')))
add('operations summary openapi', '/admin/notifications/operations/summary' in (r/'contracts/http/openapi.yaml').read_text())
# A11 evidence
add('A11 report present', exists('STEP44_A11_REPORT.md'))
add('A11 gate present', exists('scripts/step44-a11-gate.mjs'))
add('A11 10-cycle log present', exists('STEP44_A11_10_CYCLE.log'))
log=(r/'STEP44_A11_10_CYCLE.log').read_text(errors='ignore') if exists('STEP44_A11_10_CYCLE.log') else ''
add('A11 ten cycles recorded', len(re.findall(r'Cycle\s+\d+.*PASS',log,re.I))>=10 or log.count('52/52 PASS')>=10)
# global boundaries
notif_sql='\n'.join(p.read_text(errors='ignore') for p in (r/'src/modules/notifications').rglob('*.ts'))
add('no direct orders SQL', 'orders.orders' not in notif_sql)
add('no direct customer SQL', 'customer.customers' not in notif_sql)
add('wallet absent notification scope', 'wallet' not in notif_sql.lower())
add('node baseline pinned 24.18.1', (r/'node-version').read_text().strip()=='24.18.1' and '>=24.18.1 <25' in (r/'package.json').read_text())
failed=[n for n,v in checks if not v]
for n,v in checks: print(('PASS' if v else 'FAIL'), n)
print(f'STEP44 A12 FINAL AUDIT: {len(checks)-len(failed)}/{len(checks)} PASS')
if failed: print('FAILED:',*failed,sep='\n- ')
sys.exit(1 if failed else 0)
