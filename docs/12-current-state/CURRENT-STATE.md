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

Step 45 and Step 46 are not to be repeated unless a later verified regression or approved change request explicitly reopens them.

## Step 46 final canonical closure
All Step-46 substeps are complete:
- **A1 — Discovery, Scope Recovery & Business Rules Freeze — COMPLETE**
- **A2 — Marketing Domain Model + Invariants — COMPLETE / FINAL GATE PASS**
- **A3 — PostgreSQL Schema + RBAC — COMPLETE / FINAL GATE PASS**
- **A4 — Campaign Lifecycle Engine — COMPLETE / FINAL GATE PASS**
- **A5 — Coupon + Eligibility Engine — COMPLETE / FINAL GATE PASS**
- **A6 — First-Purchase + Festival Promotions — COMPLETE / FINAL GATE PASS**
- **A7 — Pricing/Cart/Checkout Integration — COMPLETE / FINAL GATE PASS**
- **A8 — Order + Redemption + Financial Integrity — COMPLETE / FINAL GATE PASS**
- **A9 — Customer Club / Points MVP Foundation — COMPLETE / FINAL GATE PASS**
- **A10 — Admin API + RBAC + Audit + Idempotency — COMPLETE / FINAL GATE PASS**
- **A11 — E2E + Concurrency + Security + Regression — COMPLETE / FINAL GATE PASS**
- **A12 — Final Canonical Closure — COMPLETE / FINAL GATE PASS**

Canonical Step-46 artifacts remain under `docs/11-step-history/STEP-46-*`.

### Step 46 final verification evidence
A11 is the final executable composition gate immediately before A12. Verification-only Draft PR #16 tested the exact A11 `main` source and was intentionally closed without merge.

Final GitHub Actions Canonical CI run `32265330752`, job `verify` (`96108299519`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 369 module files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A11 tests: **15/15 PASS**
- runtime tests: **219 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 FINAL GATE = PASS**
**STEP 46 = CLOSED / COMPLETE**

## Active step
**Step 47 — External Integration Foundation — ACTIVE**

Approved roadmap scope: configurable provider adapters for FX, SMS, email, shipping and auxiliary payment services with health status, retries/timeouts, secret boundaries and fail-closed behavior; FX must preserve preview-before-apply.

### Step 47 progress
- **A1 — Discovery + Integration Ownership / Rules Freeze — COMPLETE**
- **A2 — Common Provider Contracts + Failure Model — NEXT**
- A3 — Integration Configuration + Secrets + RBAC — PLANNED
- A4 — HTTP Client / Timeout / Retry / Circuit-Breaker Foundation — PLANNED
- A5 — Provider Health + Observability — PLANNED
- A6 — FX Provider Port + Rate Fetch — PLANNED
- A7 — FX Preview-before-Apply Integration — PLANNED
- A8 — SMS + Email Real Adapter Foundation — PLANNED
- A9 — Shipping Provider Foundation — PLANNED
- A10 — Auxiliary Payment Provider Foundation — PLANNED
- A11 — Security + Failure + Concurrency + E2E Regression — PLANNED
- A12 — Final Canonical Closure — PLANNED

Canonical A1 artifact:
- `docs/11-step-history/STEP-47-A1-DISCOVERY-SCOPE.md`

### Frozen Step-47 ownership boundary
- `src/modules/integrations` is the existing canonical integration bounded context and must be reused.
- Notifications remains authoritative for notification orchestration/delivery and its existing `NotificationProviderPort` / `NotificationProviderRegistry` must be reused for SMS/email adapters.
- Payments remains authoritative for payment/refund lifecycle and correctness.
- Fulfillment remains authoritative for shipment/fulfillment lifecycle.
- Pricing remains authoritative for product price mutation; FX providers supply observations only.
- Configuration remains the owner for non-secret provider configuration; raw credentials must not become ordinary business data.
- Provider transport failures are normalized and fail closed; no fabricated success/default business outcome is allowed.
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
