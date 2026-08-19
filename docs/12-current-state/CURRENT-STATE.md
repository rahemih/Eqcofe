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

Canonical artifacts:
- `docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`
- `docs/11-step-history/STEP-46-A3-POSTGRES-RBAC.md`
- `docs/11-step-history/STEP-46-A4-CAMPAIGN-LIFECYCLE.md`
- `docs/11-step-history/STEP-46-A5-COUPON-ELIGIBILITY.md`
- `docs/11-step-history/STEP-46-A6-FIRST-PURCHASE-FESTIVAL.md`

### A6 implementation
A6 added automatic promotion resolution for active coupon-free promotions. First-purchase promotions require a stable customer identity plus the authoritative completed-purchase fact; guest first-purchase eligibility fails closed. Returning customers are rejected. Festival promotions respect Campaign/Promotion windows, minimum subtotal, wholesale policy, usage limits, integer-Toman maximum discount and deterministic stacking rules.

Exclusive automatic promotions override stackable ones and ties resolve deterministically by promotion id. Stackable discounts are capped at subtotal so the payable amount cannot become negative. No new database schema was needed; A6 reuses the A3–A5 Campaign/Promotion/Redemption structures and counts only `reserved` + `consumed` usage.

A6 deliberately does not query Customer or Orders persistence directly. Authoritative `isWholesale` and `hasCompletedPurchase` facts remain integration inputs; Checkout wiring and atomic redemption reservation are A7/A8 responsibilities.

### A6 canonical verification evidence
Verification-only Draft PR #10 tested the exact A6 main source. The first CI run exposed a strict TypeScript narrowing issue in the automatic promotion winner selection; it was corrected before closure.

Final GitHub Actions Canonical CI run `32258059310`, job `verify` (`96084370271`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 358 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A6 tests: 8/8 PASS
- runtime tests: **164 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A6 FINAL GATE = PASS**
**A6 = COMPLETE**

### Next approved substep
**Step 46 / A7 — Pricing/Cart/Checkout Integration**

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
