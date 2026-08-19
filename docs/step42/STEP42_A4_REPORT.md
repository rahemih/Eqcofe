# EQCOFE Step 42 / A4 — Customer Profile Service + Repository

Status: **COMPLETE / PASS**
Date: 2026-08-18
Baseline A3 artifact SHA-256: `ccc739032e7d99ef33f9a74652c92ba919b29b582f29dbf18b0bc549ce95d2fd`

## Implemented
- CustomerRepository profile read/update over customer.customers.
- CustomerProfileService self-service read/update for the authenticated customer only.
- Writable allowlist limited to first_name, last_name and email; server-owned id/account_id/customer_type/status/version remain immutable from client input.
- Canonical trimming/blank normalization and lower-case email normalization with validation.
- Optimistic concurrency through version predicate and atomic version increment.
- Active-state fail-closed mutation guard; disabled/anonymized customers are not editable.
- Customer-safe response presenter excludes account_id, version and IAM/security internals.
- Transactional audit entry and customer.profile.updated.v1 outbox event on real changes.
- No-op updates are idempotent and produce no audit/event side effects.
- Event contract emits customer_id + changed_fields only; raw profile PII is not copied into the integration event.
- CustomerModule wiring for repository/service; HTTP controller intentionally remains A9 scope.

## Verification
- A4 independent static audit: 17/17 PASS.
- A4 profile unit tests: 6/6 PASS.
- Exact Node 24.18.1 / TypeScript 6.0.3 build: PASS, 0 errors.
- Full runtime regression: 40/40 PASS.
- OpenAPI: PASS, 510 paths / 579 operations / 1108 refs.
- Architecture: PASS, 297 files.
- Toman / No-Wallet / configuration-boundary policy: PASS.
- PostgreSQL 18.4 isolated-branch semantics: version 3 -> 4 update PASS; stale version update affects 0 rows; anonymized profile update affects 0 rows.

## GitHub traceability
- Canonical A4 branch: `eqcofe/step42-a4-customer-profile`
- A4 HEAD: `214334a5907f27d3fc7dd9b375b12b7ceb40f54f`
- A4 starts from A3 HEAD: `164e3916ae31beb368605b0727723b31a44595b4`
- Delta: 7 commits / 7 files, ahead 7, behind 0.

## Safety
- `backup-eqcofe-1` untouched.
- No main/default database branch modified.
- PostgreSQL integration used isolated branch `br-muddy-mountain-avr7zc8t`.
- No direct Pricing/Checkout -> customer SQL introduced.
- No Wallet or money-unit change introduced.
- No Customer HTTP route added before A9.

## Next
Step 42 / A5 — Address Book Engine.
