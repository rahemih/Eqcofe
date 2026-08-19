from pathlib import Path
r=Path('.')
checks=[]
def has(p,*x):
 s=(r/p).read_text();return all(v in s for v in x)
checks += [
('migration 0033',(r/'database/migrations/0033_notification_operations.sql').exists()),
('scheduled column',has(Path('database/migrations/0033_notification_operations.sql'),'scheduled_at','ix_notification_intents_schedule')),
('processing index',has(Path('database/migrations/0033_notification_operations.sql'),'ix_notification_delivery_processing_started')),
('command persists schedule',has(Path('src/modules/notifications/application/notification-command.service.ts'),'scheduledAt','NOTIFICATION_SCHEDULE_INVALID')),
('claim respects due schedule',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),'i.scheduled_at IS NULL OR i.scheduled_at<=now()')),
('stale recovery exists',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),'recoverStaleProcessing','NOTIFICATION_WORKER_STALE')),
('stale attempts closed',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),"status='retryable_failed'","finished_at=now()")),
('operations summary exists',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),'operationsSummary','failed_attempts_24h','oldest_due_seconds')),
('operations service',(r/'src/modules/notifications/application/notification-operations.service.ts').exists()),
('stale recovery audited',has(Path('src/modules/notifications/application/notification-operations.service.ts'),'notifications.stale_recovery','AuditWriter')),
('worker loop',(r/'apps/worker/notification-delivery-worker.service.ts').exists()),
('worker process batch',has(Path('apps/worker/notification-delivery-worker.service.ts'),'processBatch(batch)','NOTIFICATION_POLL_INTERVAL_MS')),
('worker wiring',has(Path('apps/worker/app.module.ts'),'NotificationDeliveryWorkerService')),
('scheduler notification module',has(Path('apps/scheduler/app.module.ts'),'NotificationsModule')),
('scheduler stale recovery',has(Path('apps/scheduler/scheduler-tasks.service.ts'),'recoverNotificationDeliveries','recoverStale(50)')),
('admin operations read',has(Path('src/modules/notifications/presentation/notifications.controller.ts'),"admin/notifications/operations/summary")),
('future scheduling accepted',has(Path('src/modules/notifications/presentation/notifications.controller.ts'),'scheduled_at:scheduled?.toISOString()??null')),
('no provider in scheduler','processBatch(' not in (r/'apps/scheduler/scheduler-tasks.service.ts').read_text()),
('a10 tests',(r/'test/notification-operations-a10.spec.ts').exists()),
]
failed=[n for n,v in checks if not v]
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
print(f'A10 audit: {len(checks)-len(failed)}/{len(checks)} PASS')
raise SystemExit(1 if failed else 0)
