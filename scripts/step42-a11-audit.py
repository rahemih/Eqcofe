from pathlib import Path
root=Path('.')
controller=(root/'src/modules/customer/presentation/customer.controller.ts').read_text()
customer_module=(root/'src/modules/customer/customer.module.ts').read_text()
pricing='\n'.join(p.read_text(errors='ignore') for p in (root/'src/modules/pricing').rglob('*.ts'))
cart='\n'.join(p.read_text(errors='ignore') for p in (root/'src/modules/cart').rglob('*.ts'))
customer='\n'.join(p.read_text(errors='ignore') for p in (root/'src/modules/customer').rglob('*.ts'))
migration=(root/'database/migrations/0026_customer_core.sql').read_text()
a9=(root/'database/migrations/0027_customer_http_rbac.sql').read_text()
test=(root/'test/customer-step42-e2e-security.spec.ts').read_text()
checks={
 'A11 e2e security test exists':'A7 approval changes the same authoritative state A8 commerce port reads' in test,
 'decision RBAC metadata tested':'REQUIRED_PERMISSIONS' in test,
 'step-up negative tested':'fails closed when token is absent' in test,
 'step-up binding tested':'current account and session' in test,
 'idempotency missing-key tested':'IDEMPOTENCY_KEY_REQUIRED' in test,
 'idempotency replay tested':'does not rerun business handler' in test,
 'idempotency complete-once tested':'completes,1' in test,
 'approve reject race tested':'concurrent approve vs reject produces one winner' in test,
 'customer routes actor constrained':controller.count('@CustomerOnly()')>=12,
 'approve stepup':controller.count('@RequireStepUp()')==2,
 'approve/reject decide permission':controller.count("@Permissions('customer.wholesale.decide')")==2,
 'pricing no customer sql':'customer.' not in pricing.lower() or not any(x in pricing.lower() for x in ['from customer.','join customer.','update customer.','insert into customer.','delete from customer.']),
 'cart no customer sql':not any(x in cart.lower() for x in ['from customer.','join customer.','update customer.','insert into customer.','delete from customer.']),
 'customer no orders sql':not any(x in customer.lower() for x in ['from orders.','join orders.','update orders.','insert into orders.','delete from orders.']),
 'customer no returns sql':not any(x in customer.lower() for x in ['from returns.','join returns.','update returns.','insert into returns.','delete from returns.']),
 'customer no warranty sql':not any(x in customer.lower() for x in ['from warranty.','join warranty.','update warranty.','insert into warranty.','delete from warranty.']),
 'one default db unique':'uq_customer_addresses_one_default_shipping' in migration,
 'wishlist db uniqueness':'PRIMARY KEY(customer_id,product_id)' in migration,
 'one active wholesale db unique':'uq_customer_wholesale_one_active_application' in migration,
 'terminal immutability db guard':'CUSTOMER_WHOLESALE_DECISION_IMMUTABLE' in migration,
 'promotion requires approval':'CUSTOMER_WHOLESALE_APPROVAL_REQUIRED' in migration,
 'approval/promote commit integrity':'CUSTOMER_WHOLESALE_APPROVAL_NOT_PROMOTED' in migration,
 'RBAC migration additive':'ON CONFLICT (key) DO NOTHING' in a9,
 'no automatic role grant':'role_permissions' not in a9.lower(),
 'customer module avoids owner-domain imports':all(x not in customer_module for x in ['OrdersModule','ReturnsModule','WarrantyModule']),
}
for k,v in checks.items(): print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()),[k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
