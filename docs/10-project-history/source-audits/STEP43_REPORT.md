# EQCOFE Step 43 — Central Store Configuration

Status: **FINAL_CANONICAL_CLOSED / PASS**
Date: 2026-08-18
Baseline: Step 42 FINAL_CANONICAL_CLOSED

## Scope
Central Store Configuration converts the existing empty ConfigurationModule and pre-existing OpenAPI contracts into a real configuration domain. Secrets remain environment-owned.

## Substeps
- A1 Discovery & Scope Recovery — PASS
- A2 Configuration Domain Model + Invariants — PASS
- A3 PostgreSQL Configuration Schema + RBAC — PASS
- A4 Canonical Registry + Public Resolver — PASS
- A5 Change Requests + Preview — PASS
- A6 Approval + Apply + Rollback — PASS
- A7 Feature Flag Engine — PASS
- A8 Commerce Consumer Integration — PASS
- A9 HTTP + RBAC + Step-Up + Idempotency — PASS
- A10 Audit + Outbox + Internal Evaluation — PASS
- A11 E2E + PostgreSQL + Security + 10-cycle — PASS
- A12 Final Canonical Closure — PASS

## Canonical settings seeded
- commerce.cart_ttl_hours = 168
- commerce.checkout_ttl_minutes = 15
- commerce.reservation_ttl_minutes = 15
- commerce.cart_access_token_max_active = 5
- orders.pending_ttl_minutes = 30
- orders.guest_access_ttl_days = 7
- inventory.low_stock_threshold = 10
- inventory.physical_store_reserve_percent = 20
- catalog.out_of_stock_archive_days = 30
- pricing.wholesale_quantity_discount_min_qty = 11
- sales.global_sales_enabled = true

## Safety and governance
- Low-risk direct patch only; medium/high/critical settings require a change request.
- Approve/apply/rollback and high-risk feature-flag operations are RBAC/Step-Up/Idempotency protected.
- Versioned value history and rollback are preserved.
- One active value per key/scope and one open change request per key/scope are database-enforced.
- Every applied configuration change emits `configuration.changed.v1` and is audited.
- Feature flags support deterministic rollout, disable, emergency-disable and terminal retirement.
- `INTERNAL_SERVICE_BEARER` and other secrets are not stored in configuration tables.
- No automatic role grants are introduced.
- Money remains Toman; Wallet remains absent.

## Commerce integration
- Cart TTL, checkout TTL, reservation TTL and cart-token limits resolve through the Central Configuration port.
- Order pending-confirmation TTL and guest order access TTL resolve through the Central Configuration port.
- `sales.global_sales_enabled=false` fails closed for online add/quantity/quote/reserve operations.
- Default wholesale quantity-discount threshold resolves from Central Configuration.
- Consumers do not query `configuration.*` directly; they use the public port.

## Verification
- Step43 final audit: **38/38 PASS**.
- Dedicated Step43 tests: **8/8 PASS**.
- Full runtime regression: **94/94 PASS**.
- Node 24.18.1 / TypeScript 6.0.3 build: **PASS, 0 errors**.
- OpenAPI: **PASS — 510 paths / 579 operations / 1132 refs**.
- Architecture: **PASS — 320 files**.
- Toman / No-Wallet / configuration-boundary policy: **PASS**.
- 10-cycle gate: **10/10 PASS, 940/940 successful test executions**.
- PostgreSQL 18.4 isolated verification: **PASS** — 11 canonical keys, 5 configuration permissions, active-value uniqueness, open-change uniqueness and feature-flag rollout constraints verified.
- Verification branch `br-proud-bonus-av3yzha8` was deleted; main/default database was not modified.

## GitHub traceability
- Branch: `eqcofe/step43-central-configuration`.
- Connected GitHub repository remains a partial traceability mirror, not the full canonical source tree.
- Exact SHA-256/Git-blob references for every changed canonical file are stored in `STEP43_CANONICAL_REFS.json`.

## Final Gate
**STEP 43 FINAL GATE = PASS**
**STEP 43 = CLOSED**

Next: **Step 44 — Comprehensive Notification System**.
