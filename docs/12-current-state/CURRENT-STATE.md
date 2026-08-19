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

Canonical artifacts:
- `docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`
- `docs/11-step-history/STEP-46-A3-POSTGRES-RBAC.md`

### A3 implementation
A3 added additive migrations:
- `database/migrations/0034_marketing_loyalty_core.sql`
- `database/migrations/0035_marketing_loyalty_rbac.sql`

Persistence now exists for Campaigns, Promotions, Coupons, Redemptions and the non-cash points ledger. Database checks/indexes protect active windows, Toman discount constraints, coupon normalization, redemption lifecycle/idempotency and non-negative points balance under concurrent writes.

RBAC now includes `marketing.view`, `marketing.manage`, `marketing.activate`, `marketing.redemption.view`, `marketing.redemption.manage`, `loyalty.view` and `loyalty.adjust`, with sensitive mutations classified high/critical. Role assignment remains explicit rather than automatic.

### A3 canonical verification evidence
Verification-only Draft PR #7 tested the exact A3 main base commit `a95d8dc264c130dd4034531c1fc2acecbb60d77a`; its branch added only a documentation trigger marker.

GitHub Actions Canonical CI run `32254988853`, job `verify` (`96074498864`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 351 module files scanned
- project policy: PASS
- TypeScript build: PASS
- runtime tests: **140 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- A3 persistence/RBAC tests: 6/6 PASS
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A3 FINAL GATE = PASS**
**A3 = COMPLETE**

### Next approved substep
**Step 46 / A4 — Campaign Lifecycle Engine**

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
