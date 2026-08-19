from pathlib import Path
c=Path('src/modules/customer/presentation/customer.controller.ts').read_text(); mod=Path('src/modules/customer/customer.module.ts').read_text(); mig=Path('database/migrations/0027_customer_http_rbac.sql').read_text(); idem=Path('src/platform/idempotency/idempotency.interceptor.ts').read_text(); step=Path('src/platform/auth/step-up.guard.ts').read_text(); perm=Path('src/platform/auth/permissions.guard.ts').read_text()
checks={
'customer controller exists':'class CustomerController' in c,
'admin controller exists':'class CustomerWholesaleAdminController' in c,
'profile routes':'customer/profile' in c,
'address routes':'customer/addresses' in c and 'set-default' in c,
'wishlist routes':'customer/wishlist/:product_id' in c,
'wholesale customer routes':'customer/wholesale/applications' in c and 'customer/wholesale/application' in c,
'admin wholesale routes':"@Controller('admin/wholesale/applications')" in c,
'customer actor guards':c.count('@CustomerOnly()')>=12,
'staff actor guard':'@StaffOnly()' in c,
'admin view permission':"Permissions('customer.wholesale.view')" in c,
'admin review permission':"Permissions('customer.wholesale.review')" in c,
'admin decide permission':"Permissions('customer.wholesale.decide')" in c,
'approve step-up':"RequireStepUp() @RequireIdempotency('customer.wholesale.approve')" in c,
'reject step-up':"RequireStepUp() @RequireIdempotency('customer.wholesale.reject')" in c,
'profile idempotency':"customer.profile.update" in c,
'address idempotency':all(x in c for x in ['customer.address.create','customer.address.update','customer.address.set_default','customer.address.delete']),
'wishlist idempotency':all(x in c for x in ['customer.wishlist.add','customer.wishlist.remove']),
'wholesale idempotency':all(x in c for x in ['customer.wholesale.submit','customer.wholesale.start_review','customer.wholesale.approve','customer.wholesale.reject']),
'canonical interceptor wired':'IDEMPOTENCY_KEY_REQUIRED' in idem and 'idempotency-key' in idem,
'canonical stepup wired':"x-step-up-token" in step and "'step_up'" in step,
'canonical permission guard':'REQUIRED_PERMISSIONS' in perm,
'permissions migration':all(x in mig for x in ['customer.wholesale.view','customer.wholesale.review','customer.wholesale.decide']),
'migration additive':'ON CONFLICT (key) DO NOTHING' in mig,
'controllers module wired':'controllers:[CustomerController,CustomerWholesaleAdminController]' in mod,
'no public customer routes':'@Public()' not in c,
'no direct SQL in controller':'customer.customers' not in c and 'customer.wholesale_applications' not in c,
}
for k,v in checks.items():print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()),[k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
