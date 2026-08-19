# EQCOFE Step 42 / A9 — HTTP + RBAC + Step-Up + Idempotency

Status: **COMPLETE / PASS WITH ENVIRONMENT NOTE**
Date: 2026-08-18
Baseline A8 HEAD: `2bf6f1301c0f0a2f02cdd968fc2fd88a40453670`

## Implemented
- Customer HTTP routes wired for Profile, Address Book, Wishlist and Wholesale application.
- All Customer routes are `CustomerOnly`; ownership/customer identity remains server-derived inside A4-A7 services.
- Admin wholesale routes are `StaffOnly` plus granular permissions: `customer.wholesale.view`, `customer.wholesale.review`, `customer.wholesale.decide`.
- Approve and Reject require canonical Step-Up guard and canonical Idempotency interceptor metadata.
- Customer mutations and wholesale start-review/decisions use `Idempotency-Key` scopes.
- Additive RBAC migration `0027_customer_http_rbac.sql`; no automatic role assignment.
- OpenAPI updated with Idempotency-Key parameters for A9 mutations and Step-Up security for wholesale approve/reject; generated OpenAPI types regenerated.
- No controller contains direct Customer persistence SQL.

## Verification
- A9 invariant audit: 26/26 PASS.
- A9 HTTP/security tests: 5/5 PASS.
- TypeScript 6.0.3 build: PASS, 0 errors.
- Full runtime regression: 72/72 PASS.
- OpenAPI: PASS, 510 paths / 579 operations / 1119 refs.
- Architecture: PASS, 306 files.
- Toman / No-Wallet / configuration-boundary policy: PASS.
- Current execution shell Node: 22.16.0 (Node 24 binary was not present in the current container); no source/runtime regression was observed.
- Neon isolated branch RBAC migration execution could not be completed because that old verification branch does not contain `admin.permissions`; main/default database was not touched.

## GitHub traceability
- Branch: `eqcofe/step42-a9-http-security`
- Base A8 HEAD: `2bf6f1301c0f0a2f02cdd968fc2fd88a40453670`
- GitHub branch delta: 4 commits / 4 files, ahead 4, behind 0.
- GitHub mirror contains controller/module/RBAC migration/test delta. Canonical A9 artifact additionally contains the validated OpenAPI and regenerated type updates; those large contract files were not mirrored in this connector pass and remain a traceability gap to be reconciled before A12 closure.

## Safety
- `backup-eqcofe-1` untouched.
- No main/default database branch modified.
- No direct Pricing/Checkout -> Customer SQL introduced.
- No Wallet or money-unit change.
- No automatic admin role grants introduced.

## Next
Step 42 / A10 — Customer Order/Return/Warranty Read Models without domain ownership violation.
