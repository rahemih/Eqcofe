from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
m=(root/'database/migrations/0026_customer_core.sql').read_text()
checks={
'customer addresses table': 'CREATE TABLE IF NOT EXISTS customer.addresses' in m,
'address ownership fk': 'customer_id uuid NOT NULL REFERENCES customer.customers(id)' in m,
'address one default partial unique': 'uq_customer_addresses_one_default_shipping' in m and 'WHERE is_default_shipping' in m,
'address optimistic version': 'version bigint NOT NULL DEFAULT 1 CHECK(version>0)' in m,
'address shipping validation': "recipient_mobile ~ '^09[0-9]{9}$'" in m and "postal_code ~ '^[0-9]{10}$'" in m,
'wishlist table': 'CREATE TABLE IF NOT EXISTS customer.wishlist_items' in m,
'wishlist set key': 'PRIMARY KEY(customer_id,product_id)' in m,
'wishlist catalog lineage': 'REFERENCES catalog.products(id) ON DELETE RESTRICT' in m,
'wholesale applications table': 'CREATE TABLE IF NOT EXISTS customer.wholesale_applications' in m,
'wholesale lifecycle states': all(x in m for x in ["'submitted'","'under_review'","'approved'","'rejected'"]),
'one active wholesale application': 'uq_customer_wholesale_one_active_application' in m and "WHERE status IN ('submitted','under_review')" in m,
'wholesale reviewer field': 'reviewer_staff_id uuid NULL REFERENCES admin.staff_profiles(id)' in m,
'admin queue index': 'ix_customer_wholesale_admin_queue' in m,
'customer eligibility lock': 'FOR UPDATE;' in m and 'CUSTOMER_ALREADY_WHOLESALE' in m,
'legal transition guard': 'CUSTOMER_WHOLESALE_INVALID_TRANSITION' in m,
'terminal immutable guard': 'CUSTOMER_WHOLESALE_DECISION_IMMUTABLE' in m,
'ownership immutable': 'CUSTOMER_WHOLESALE_OWNERSHIP_IMMUTABLE' in m,
'reviewer immutable': 'CUSTOMER_WHOLESALE_REVIEWER_IMMUTABLE' in m,
'wholesale optimistic version': 'CUSTOMER_WHOLESALE_VERSION_MUST_INCREMENT' in m,
'promotion requires approval': 'CUSTOMER_WHOLESALE_APPROVAL_REQUIRED' in m,
'approval promotion deferred guard': 'CUSTOMER_WHOLESALE_APPROVAL_NOT_PROMOTED' in m and 'DEFERRABLE INITIALLY DEFERRED' in m,
'no new money': '_toman' not in m.lower(),
'no wallet': 'wallet' not in m.lower(),
'transaction wrapper': m.lstrip().startswith('BEGIN;') and m.rstrip().endswith('COMMIT;'),
}
for k,v in checks.items(): print(('PASS ' if v else 'FAIL ')+k)
print(f"{sum(checks.values())}/{len(checks)} PASS")
sys.exit(0 if all(checks.values()) else 1)
