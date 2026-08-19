from pathlib import Path
R=Path('.')
read=lambda p:(R/p).read_text()
m=read('database/migrations/0028_configuration_core.sql'); r=read('database/migrations/0029_configuration_rbac.sql'); mod=read('src/modules/configuration/configuration.module.ts'); ctl=read('src/modules/configuration/presentation/configuration.controller.ts'); svc=read('src/modules/configuration/application/configuration.service.ts'); ff=read('src/modules/configuration/application/feature-flag.service.ts'); reg=read('src/modules/configuration/domain/configuration.registry.ts'); repo=read('src/modules/configuration/infrastructure/configuration.repository.ts'); cart=read('src/modules/cart/application/cart.service.ts'); order=read('src/modules/orders/application/order.service.ts'); pricing=read('src/modules/pricing/application/price-rule.service.ts'); env=read('src/platform/config/env.validation.ts'); openapi=read('contracts/http/openapi.yaml')
checks={
'schema values': 'configuration.configuration_values' in m,
'schema changes': 'configuration.change_requests' in m,
'schema flags': 'configuration.feature_flags' in m,
'one active value': 'uq_configuration_active_value' in m,
'one open change': 'uq_configuration_one_open_change' in m,
'history index': 'ix_configuration_values_history' in m,
'scope shape': 'configuration_scope_shape' in m,
'canonical keys seeded': all(k in m for k in ['commerce.cart_ttl_hours','inventory.physical_store_reserve_percent','sales.global_sales_enabled']),
'wallet absent': 'wallet' not in (m+r+reg).lower(),
'known registry': 'CONFIGURATION_DEFINITIONS' in reg,
'value validation': 'validateConfigurationValue' in reg,
'critical reserve': "riskLevel:'critical'" in reg and 'physical_store_reserve_percent' in reg,
'repository locks': 'FOR UPDATE' in repo,
'change states': all(x in m for x in ['submitted','approved','rejected','cancelled','applied']),
'change request required': 'CONFIGURATION_CHANGE_REQUEST_REQUIRED' in svc,
'approved before apply': "status!=='approved'" in svc,
'rollback history': 'CONFIGURATION_ROLLBACK_UNAVAILABLE' in svc,
'outbox event': 'configuration.changed.v1' in svc,
'audit apply': "action:'configuration.change.apply'" in svc,
'feature deterministic': "createHash('sha256')" in ff,
'feature retire terminal': 'FEATURE_FLAG_RETIRED' in ff,
'feature emergency disable': 'emergencyDisable' in ff,
'internal bearer': 'INTERNAL_SERVICE_BEARER' in ctl and 'INTERNAL_SERVICE_BEARER' in env,
'config view permission': 'configuration.view' in r and 'configuration.view' in ctl,
'config apply critical permission': 'configuration.apply' in r and 'configuration.apply' in ctl,
'feature permission': 'configuration.feature_flags.manage' in r and 'configuration.feature_flags.manage' in ctl,
'stepup': ctl.count('@RequireStepUp()')>=5,
'idempotency': ctl.count('@RequireIdempotency(')>=10,
'public port exported': 'STORE_CONFIGURATION_PORT' in mod and 'exports:' in mod,
'cart central config': 'STORE_CONFIGURATION_PORT' in cart and 'ConfigService' not in cart,
'order central config': 'STORE_CONFIGURATION_PORT' in order and 'ConfigService' not in order,
'no config sql in consumers': 'configuration.configuration_' not in cart and 'configuration.configuration_' not in order,
'no secret in db': 'INTERNAL_SERVICE_BEARER' not in m,
'no automatic role grants': 'role_permissions' not in r.lower(),
'global sales gate consumed': 'sales.global_sales_enabled' in cart and 'SALES_GLOBALLY_DISABLED' in cart,
'wholesale min qty consumed': 'pricing.wholesale_quantity_discount_min_qty' in pricing,
'openapi idempotency extended': openapi.count('IdempotencyKey')>=20,
'openapi stepup config': 'operationId: postAdminConfigurationKeyRollback' in openapi and 'stepUpToken' in openapi,
}
for k,v in checks.items():print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()),[k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
