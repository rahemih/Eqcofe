# EQCOFE Current State

## Trusted state date
**2026-08-20**

## Official repository
- Repository: `rahemih/Eqcofe`
- Default/canonical branch: `main`
- Historical repository: `rahemih/digikala-clone` — retained as historical/recovery evidence; it is not the canonical application source.

## Canonical baseline lineage
Verified Step-44 baseline: `b239dfe825b615f36caf2e26cc7abc80c70d349c`.
Later implementation advances `main` beyond that immutable reference.

## Closed steps
- **Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**
- **Step 46 — Marketing, Promotions & Customer Club Backend — CLOSED / FINAL GATE PASS**

## Active step
**Step 47 — External Integration Foundation — ACTIVE**

Approved roadmap scope: configurable provider adapters for FX, SMS, email, shipping and auxiliary payment services with health status, retries/timeouts, secret boundaries and fail-closed behavior; FX must preserve preview-before-apply.

### Step 47 progress
- **A1 — Discovery + Integration Ownership / Rules Freeze — COMPLETE**
- **A2 — Common Provider Contracts + Failure Model — COMPLETE / FINAL GATE PASS**
- **A3 — Integration Configuration + Secrets + RBAC — COMPLETE / FINAL GATE PASS**
- **A4 — HTTP Client / Timeout / Retry / Circuit-Breaker Foundation — NEXT**
- A5 — Provider Health + Observability — PLANNED
- A6 — FX Provider Port + Rate Fetch — PLANNED
- A7 — FX Preview-before-Apply Integration — PLANNED
- A8 — SMS + Email Real Adapter Foundation — PLANNED
- A9 — Shipping Provider Foundation — PLANNED
- A10 — Auxiliary Payment Provider Foundation — PLANNED
- A11 — Security + Failure + Concurrency + E2E Regression — PLANNED
- A12 — Final Canonical Closure — PLANNED

Canonical Step-47 artifacts:
- `docs/11-step-history/STEP-47-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-47-A2-PROVIDER-CONTRACTS-FAILURE-MODEL.md`
- `docs/11-step-history/STEP-47-A3-INTEGRATION-CONFIG-SECRETS-RBAC.md`

### Step 47 A2 verification evidence
Draft PR #21 verified A2. Canonical CI run `32311586849`, job `verify` (`96255496092`) passed with 252/252 runtime tests.

### Step 47 A3 verification evidence
Draft PR #22 verified A3. Final Canonical CI run `32312649706`, job `verify` (`96258605260`) passed:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 388 module files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A3 tests: **6/6 PASS**
- runtime tests: **258 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

### Frozen Step-47 ownership and secret boundary
- `src/modules/integrations` remains the canonical integration bounded context.
- Notifications remains authoritative for SMS/email delivery semantics.
- Payments remains authoritative for payment/refund lifecycle and correctness.
- Fulfillment remains authoritative for shipment/fulfillment lifecycle.
- Pricing remains authoritative for product price mutation; FX providers supply observations only.
- Non-secret provider configuration may be persisted under `integrations.provider_configurations`.
- Secret values remain environment-owned and are accessed only through the platform configuration boundary; only a validated `EQCOFE_*` secret reference may be persisted.
- Sensitive-looking keys are rejected from provider JSON configuration at both domain and database boundaries.
- Provider transport failures remain normalized and fail closed.
- All network requests require finite timeout; retries must be bounded and safe/idempotent.
- FX-driven price mutation must preserve preview-before-apply and integer Toman rules.

## Frozen Step-46 ownership boundary
- Pricing remains authoritative for base pricing.
- Marketing owns campaign/promotion/coupon eligibility and redemption state.
- Cart/Checkout persists commercial snapshots including discounts.
- Orders consumes the reserved checkout snapshot.
- Customer supplies customer/wholesale eligibility facts.
- Finance remains authoritative for downstream profit/financial accounting.
- Loyalty is a non-cash points ledger only.
- Cash-account functionality remains prohibited.

## Global trust rules
1. `rahemih/Eqcofe` is the official repository.
2. `main` is the canonical branch.
3. `docs/12-current-state/MASTER-ROADMAP.md` is the canonical execution roadmap.
4. Financial values remain integer Toman.
5. Cash-account functionality must not be reintroduced.
6. A step/substep is not COMPLETE merely because code exists; applicable implementation, migrations, tests, contracts, security and documentation gates must pass.
7. Historical recovery evidence must not be rewritten as newly verified implementation.
