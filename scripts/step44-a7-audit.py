from pathlib import Path
r=Path('.')
checks=[]
def has(p,*xs):
 s=(r/p).read_text(); return all(x in s for x in xs)
checks += [
 ('provider port exists',(r/'src/modules/notifications/application/ports/notification-provider.port.ts').exists()),
 ('provider registry exists',(r/'src/modules/notifications/infrastructure/notification-provider.registry.ts').exists()),
 ('registry has no default fabricated provider',has(Path('src/modules/notifications/infrastructure/notification-provider.registry.ts'),'new Map','get(channel','??null')),
 ('outbound channels only',has(Path('src/modules/notifications/application/ports/notification-provider.port.ts'),"'sms'|'email'")),
 ('delivery service exists',(r/'src/modules/notifications/application/notification-delivery.service.ts').exists()),
 ('delivery repository exists',(r/'src/modules/notifications/infrastructure/notification-delivery.repository.ts').exists()),
 ('claim uses skip locked',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),'FOR UPDATE OF d SKIP LOCKED')),
 ('claim marks processing',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),"status='processing'")),
 ('network call outside repository transaction',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'provider.send(')),
 ('authoritative recipient re-resolution',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'this.recipients.resolve')),
 ('missing provider blocks',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'NOTIFICATION_PROVIDER_UNAVAILABLE','finalizeBlocked')),
 ('missing destination blocks',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'NOTIFICATION_DESTINATION_UNAVAILABLE')),
 ('attempt history append only path',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),'INSERT INTO notifications.delivery_attempts')),
 ('success marks delivered',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),"status='delivered'")),
 ('retry wait scheduled',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),"status='retry_wait'",'next_attempt_at')),
 ('dead letter supported',has(Path('src/modules/notifications/infrastructure/notification-delivery.repository.ts'),"'dead_lettered'")),
 ('retry backoff policy exists',(r/'src/modules/notifications/domain/notification-retry.policy.ts').exists()),
 ('retry config used',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'notifications.retry.max_attempts','notifications.retry.base_seconds','notifications.retry.max_seconds')),
 ('provider exception retryable',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'NOTIFICATION_PROVIDER_EXCEPTION','retryable_failure')),
 ('delivered event emitted',has(Path('src/modules/notifications/domain/notification.events.ts'),'notification.delivery.${type}.v1')),
 ('audit emitted',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'notifications.delivery.${row.status}')),
 ('outbox emitted',has(Path('src/modules/notifications/application/notification-delivery.service.ts'),'deliveryEvent(')),
 ('module exports delivery engine',has(Path('src/modules/notifications/notifications.module.ts'),'NotificationDeliveryService')),
 ('no live provider implementation',not any(p.name.endswith('.provider.ts') and p.name!='notification-provider.port.ts' for p in (r/'src/modules/notifications').rglob('*.provider.ts'))),
 ('a7 tests exist',(r/'test/notification-delivery-a7.spec.ts').exists()),
 ('step47 provider boundary preserved','IntegrationsModule' not in (r/'src/modules/notifications/notifications.module.ts').read_text()),
]
failed=[n for n,o in checks if not o]
for n,o in checks: print(('PASS' if o else 'FAIL'),n)
print(f'A7 audit: {len(checks)-len(failed)}/{len(checks)} PASS')
raise SystemExit(1 if failed else 0)
