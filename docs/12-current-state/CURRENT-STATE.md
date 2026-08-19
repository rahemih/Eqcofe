# EQCOFE Current State

## Trusted state date
**2026-08-19**

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

Canonical Step-46 artifacts:
- `docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`
- `docs/11-step-history/STEP-46-A3-POSTGRES-RBAC.md`
- `docs/11-step-history/STEP-46-A4-CAMPAIGN-LIFECYCLE.md`
- `docs/11-step-history/STEP-46-A5-COUPON-ELIGIBILITY.md`
- `docs/11-step-history/STEP-46-A6-FIRST-PURCHASE-FESTIVAL.md`
- `docs/11-step-history/STEP-46-A7-PRICING-CART-CHECKOUT-INTEGRATION.md`
- `docs/11-step-history/STEP-46-A8-ORDER-REDEMPTION-FINANCIAL-INTEGRITY.md`
- `docs/11-step-history/STEP-46-A9-CUSTOMER-CLUB-POINTS-MVP.md`
- `docs/11-step-history/STEP-46-A10-ADMIN-API-RBAC-AUDIT-IDEMPOTENCY.md`
- `docs/11-step-history/STEP-46-A11-E2E-CONCURRENCY-SECURITY-REGRESSION.md`
- `docs/11-step-history/STEP-46-A12-FINAL-CANONICAL-CLOSURE.md`

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

A12 is documentation/canonical-state closure only and changes no runtime implementation.

Therefore:
**STEP 46 FINAL GATE = PASS**
**STEP 46 = CLOSED / COMPLETE**

## Active step
**Step 47 — External Integration Foundation — NEXT**

Approved roadmap scope: configurable provider adapters for FX, SMS, email, shipping and auxiliary payment services with health status, retries/timeouts, secret boundaries and fail-closed behavior; FX must preserve preview-before-apply.

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
