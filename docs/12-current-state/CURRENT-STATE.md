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

Canonical artifacts:
- `docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`
- `docs/11-step-history/STEP-46-A3-POSTGRES-RBAC.md`
- `docs/11-step-history/STEP-46-A4-CAMPAIGN-LIFECYCLE.md`
- `docs/11-step-history/STEP-46-A5-COUPON-ELIGIBILITY.md`
- `docs/11-step-history/STEP-46-A6-FIRST-PURCHASE-FESTIVAL.md`
- `docs/11-step-history/STEP-46-A7-PRICING-CART-CHECKOUT-INTEGRATION.md`

### A7 implementation
A7 integrates Marketing with the authoritative Pricing/Cart/Checkout flow. Pricing still owns line/base pricing; Marketing is evaluated on the post-Pricing merchandise amount. Cart obtains customer type from Customer and completed-purchase history from an Orders-owned public port, so client input cannot forge wholesale or first-purchase facts.

`CheckoutPromotionService` deterministically composes automatic and coupon-backed promotions. Checkout accepts optional `coupon_code`, persists `marketing_discount_toman` and `marketing_snapshot`, and keeps `discount_toman` as the compatible total discount. Additive migration `0038_marketing_checkout_snapshot.sql` updates Checkout/Order financial integrity functions and copies the exact Checkout marketing snapshot into Orders without recalculation.

A7 intentionally does not claim atomic coupon/promotion redemption reservation. Redemption reservation/consume/release, retry/concurrency behavior and final promotion financial integrity are A8 responsibilities.

### A7 canonical verification evidence
The initial CI attempt passed OpenAPI, architecture, policy and TypeScript build but exposed two legacy cart-pricing harness failures caused by the newly injected A7 dependencies. The harness was adapted with explicit test doubles; production logic was not weakened.

Final GitHub Actions Canonical CI run `32260541195`, job `verify` (`96092481216`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 362 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A7 tests: 9/9 PASS
- runtime tests: **173 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A7 FINAL GATE = PASS**
**A7 = COMPLETE**

### Next approved substep
**Step 46 / A8 — Order + Redemption + Financial Integrity**

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
