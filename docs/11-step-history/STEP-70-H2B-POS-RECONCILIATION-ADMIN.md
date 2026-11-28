# Step 70-H2B — Admin POS reconciliation: failed list, inspect, explicit retry, abandon

Task: `EQCOFE-STEP70-H2B-POS-RECONCILIATION-ADMIN-001` (HIGH). New protected parent/main: `6aef2114c4a39f8e6826424a72f0acf33f5a9b35` (H2A PR #434 canonical merge). The old #429/#431/#433 branches are excluded from this clean task; this implementation does not rewrite H2A source, backend, workflows or permissions.

## Scope
New server-only `pos-reconciliation.server.ts` and `/pos/reconciliation` route present exactly four existing source-backed API operations:
1. `GET /admin/pos/reconciliation/failed` — bounded 1..100; no stale list fabrication.
2. `GET /admin/pos/reconciliation/{clientCommandId}` — scoped command status and recovery history whitelist.
3. `POST /admin/pos/reconciliation/{clientCommandId}/retry` — explicit recovery request after a fresh WebAuthn step-up.
4. `POST /admin/pos/reconciliation/{clientCommandId}/abandon` — explicit discard after a fresh WebAuthn step-up.

All four require staff `pos.reconcile`; backend is the authority. Retry/abandon require preflight freshness and `@RequireStepUp` and server-only `X-Step-Up-Token`, strict UUID and 500-character note, server-generated idempotency key, audit trail, and fail-closed no automated replay for ambiguous/408/5xx outcomes. Retry only reopens an eligible failed command and requires the original owner to sync; no optimistic financial/inventory effects.

## Governance
Exact nine task write paths, HIGH floor, own ACTIVE Scope Lock, source review, exact-head provider CodeQL aggregate/three analyzers, Canonical CI, Phase A/PostgreSQL, Step57, Step58 if applicable (Admin/docs-only paths normally exclude storefront filter), separate `INTERNAL_SECURITY:ASSESSED` if applicable, independent later Project Owner `OWNER_RISK:ACCEPTED` and still later `HUMAN:APPROVED`, successful refreshed Merge Policy, and only official protected GitHub workflow_dispatch for merging. Then exact merge SHA, postmerge tests, CodeQL provider checks and terminal lock release. This code commit/PR is NOT any of those approvals. Step70 remains OPEN; Step70-I/J and Step71 are excluded.
