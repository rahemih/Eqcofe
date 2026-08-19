from pathlib import Path
r=Path('/mnt/data/step44_a9/src')
checks=[]
def has(p,*n):
 s=(r/p).read_text(); return all(x in s for x in n)
ctl=(r/'src/modules/notifications/presentation/notifications.controller.ts').read_text()
api=(r/'contracts/http/openapi.yaml').read_text()
checks += [
('controller exists',(r/'src/modules/notifications/presentation/notifications.controller.ts').exists()),
('admin service exists',(r/'src/modules/notifications/application/notification-admin.service.ts').exists()),
('http migration exists',(r/'database/migrations/0032_notification_http_rbac.sql').exists()),
('view permission',"Permissions('notifications.view')" in ctl),
('retry permission',"Permissions('notifications.retry')" in ctl),
('template view permission',"Permissions('notifications.templates.view')" in ctl),
('template manage permission',"Permissions('notifications.templates.manage')" in ctl),
('retry stepup idempotent',"Permissions('notifications.retry') @RequireStepUp() @RequireIdempotency('notifications.retry')" in ctl),
('create stepup idempotent',"RequireIdempotency('notifications.template.create')" in ctl),
('revise stepup idempotent',"RequireIdempotency('notifications.template.revise')" in ctl),
('activate stepup idempotent',"RequireIdempotency('notifications.template.activate')" in ctl),
('retire stepup idempotent',"RequireIdempotency('notifications.template.retire')" in ctl),
('preview read only',"Permissions('notifications.templates.view') @Post('admin/notifications/templates/:id/preview')" in ctl),
('internal public explicit auth',"@Public() @RequireIdempotency('notifications.internal.enqueue')" in ctl and 'INTERNAL_SERVICE_BEARER' in ctl),
('recipient exclusive', 'Boolean(customer)===Boolean(staff)' in ctl),
('future schedule deferred','NOTIFICATION_SCHEDULE_DEFERRED' in ctl),
('internal server source identity','source_id:`internal:${key}`' in ctl),
('internal command method',has(Path('src/modules/notifications/application/notification-command.service.ts'),'enqueueInternal')),
('template key override',has(Path('src/modules/notifications/application/notification-command.service.ts'),'templateKey=String(input.template_key??kind)')),
('name fa schema','ADD COLUMN IF NOT EXISTS name_fa' in (r/'database/migrations/0032_notification_http_rbac.sql').read_text()),
('revision immutable version',has(Path('src/modules/notifications/application/notification-template.service.ts'),'async revise','nextVersion(ex,before.template_key')),
('manual retry explicit db guard',"eqcofe.notification_manual_retry" in (r/'database/migrations/0032_notification_http_rbac.sql').read_text()),
('manual retry repo guard',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),'manualRetry','status IN (\'blocked\',\'failed\',\'dead_lettered\',\'retry_wait\')')),
('delivered not retried',"status IN ('blocked','failed','dead_lettered','retry_wait')" in (r/'src/modules/notifications/infrastructure/notification-delivery.repository.ts').read_text()),
('module controller wired',has(Path('src/modules/notifications/notifications.module.ts'),'controllers:[NotificationsController]','NotificationAdminService')),
('openapi activate','/admin/notifications/templates/{id}/activate:' in api),
('openapi retire','/admin/notifications/templates/{id}/retire:' in api),
('openapi internal idem',api.count("#/components/parameters/IdempotencyKey")>5),
('generated types updated',(r/'src/generated/openapi.ts').exists()),
('a9 tests',(r/'test/notification-http-a9.spec.ts').exists()),
]
fail=[n for n,v in checks if not v]
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
print(f'A9 audit: {len(checks)-len(fail)}/{len(checks)} PASS')
raise SystemExit(1 if fail else 0)
