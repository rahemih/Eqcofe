from pathlib import Path
import json, hashlib
r=Path('.')
checks={}
# A11 final evidence
checks['A11 audit exists']=(r/'scripts/step42-a11-audit.py').exists()
checks['A11 e2e test exists']=(r/'test/customer-step42-e2e-security.spec.ts').exists()
# core A3/A9 migrations
m26=(r/'database/migrations/0026_customer_core.sql').read_text()
m27=(r/'database/migrations/0027_customer_http_rbac.sql').read_text()
checks['one default address']='uq_customer_addresses_one_default_shipping' in m26
checks['wishlist uniqueness']='PRIMARY KEY(customer_id,product_id)' in m26
checks['one active wholesale']='uq_customer_wholesale_one_active_application' in m26
checks['terminal immutable']='CUSTOMER_WHOLESALE_DECISION_IMMUTABLE' in m26
checks['approval promotion guard']='CUSTOMER_WHOLESALE_APPROVAL_NOT_PROMOTED' in m26
checks['A9 RBAC additive']='ON CONFLICT (key) DO NOTHING' in m27
checks['A9 no automatic role grants']='role_permissions' not in m27.lower()
# boundaries
customer='\n'.join(p.read_text(errors='ignore') for p in (r/'src/modules/customer').rglob('*.ts')).lower()
pricing='\n'.join(p.read_text(errors='ignore') for p in (r/'src/modules/pricing').rglob('*.ts')).lower()
cart='\n'.join(p.read_text(errors='ignore') for p in (r/'src/modules/cart').rglob('*.ts')).lower()
checks['pricing no customer sql']=not any(x in pricing for x in ['from customer.','join customer.','update customer.','insert into customer.','delete from customer.'])
checks['cart no customer sql']=not any(x in cart for x in ['from customer.','join customer.','update customer.','insert into customer.','delete from customer.'])
checks['customer no orders sql']=not any(x in customer for x in ['from orders.','join orders.','update orders.','insert into orders.','delete from orders.'])
checks['customer no returns sql']=not any(x in customer for x in ['from returns.','join returns.','update returns.','insert into returns.','delete from returns.'])
checks['customer no warranty sql']=not any(x in customer for x in ['from warranty.','join warranty.','update warranty.','insert into warranty.','delete from warranty.'])
# contract exact hashes
refs=json.loads((r/'STEP42_A12_CANONICAL_REFS.json').read_text())
for rel,meta in refs['contracts'].items():
    b=(r/rel).read_bytes()
    checks[f'{rel} size']=len(b)==meta['size_bytes']
    checks[f'{rel} sha256']=hashlib.sha256(b).hexdigest()==meta['sha256']
# event contracts
for name in ['customer.profile.updated.v1','customer.address.created.v1','customer.address.updated.v1','customer.address.deleted.v1','customer.address.default_changed.v1','customer.wishlist.item_added.v1','customer.wishlist.item_removed.v1','customer.wholesale_application.submitted.v1','customer.wholesale_application.review_started.v1','customer.wholesale_application.approved.v1','customer.wholesale_application.rejected.v1','customer.type_changed.v1']:
    checks[f'event {name}']=(r/f'contracts/events/{name}.schema.json').exists()
for k,v in checks.items(): print(('PASS' if v else 'FAIL'),k)
assert all(checks.values()), [k for k,v in checks.items() if not v]
print(f'{sum(checks.values())}/{len(checks)} PASS')
