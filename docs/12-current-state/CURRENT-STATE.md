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

## Step 45 closure
**Step 45 — Content, Articles & SEO Backend — CLOSED / FINAL GATE PASS**
Step 45 is not to be repeated.

## Active step
**Step 46 — Marketing, Promotions & Customer Club Backend**

### Completed substeps
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

Canonical artifacts:
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

### A10 implementation
A10 adds staff-only administrative surfaces for Marketing and Loyalty. Marketing Admin exposes Campaign operations, Promotion list/create/enable/disable, Coupon list/create/enable/disable, and read-only Redemption history. Loyalty Admin exposes customer points balance/history plus critical manual adjustment and exact reversal.

A3 RBAC keys are reused rather than duplicated. Critical Marketing activation/deactivation and Loyalty correction routes require Step-Up. All administrative mutations require canonical idempotency scopes. Promotion/Coupon mutations use optimistic version checks and transaction-scoped audit. Loyalty adjustment/reversal writes the immutable ledger entry and audit record in the same transaction executor.

Redemption remains intentionally read-only in Admin because A8 binds Redemption lifecycle to authoritative Checkout/Order state and deferred financial integrity; arbitrary manual state changes would violate that invariant.

### A10 canonical verification evidence
Verification-only Draft PR #15 tested the exact A10 `main` source; its branch added only a documentation CI marker and is not part of canonical source.

Final GitHub Actions Canonical CI run `32264512373`, job `verify` (`96105581639`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 369 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A10 tests: **10/10 PASS**
- runtime tests: **204 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A10 FINAL GATE = PASS**
**A10 = COMPLETE**

### Next approved substep
**Step 46 / A11 — E2E + Concurrency + Security + Regression**

## Step-46 ownership boundary
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
