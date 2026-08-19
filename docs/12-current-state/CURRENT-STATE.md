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

Canonical artifacts:
- `docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`
- `docs/11-step-history/STEP-46-A3-POSTGRES-RBAC.md`
- `docs/11-step-history/STEP-46-A4-CAMPAIGN-LIFECYCLE.md`
- `docs/11-step-history/STEP-46-A5-COUPON-ELIGIBILITY.md`

### A5 implementation
A5 added `CouponEligibilityService` and `CouponEligibilityRepository` to the Marketing module. Coupon evaluation now fails closed across campaign/promotion/coupon state and windows, minimum subtotal, first-purchase fact, wholesale policy, total usage, per-customer usage and maximum discount cap while keeping all monetary outputs in integer Toman.

Additive migration `0037_marketing_coupon_eligibility_hardening.sql` aligns the PostgreSQL coupon format with the domain contract, prevents coupon windows from exceeding their promotion window, and adds active-redemption usage indexes.

A5 deliberately accepts authoritative `isWholesale` and `hasCompletedPurchase` facts rather than inferring them or directly querying foreign module persistence. Checkout/Orders wiring and atomic reservation remain later integration/integrity work.

### A5 canonical verification evidence
The initial verification run found one brittle A4 regression assertion that required the Marketing exports array to contain exactly one service. The assertion was made extensible; no A4 production behavior was changed.

GitHub Actions Canonical CI rerun `32256531549`, job `verify` (`96079417704`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 356 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A5 tests: 8/8 PASS
- runtime tests: **156 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A5 FINAL GATE = PASS**
**A5 = COMPLETE**

### Next approved substep
**Step 46 / A6 — First-Purchase + Festival Promotions**

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
