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

Canonical artifacts:
- `docs/11-step-history/STEP-46-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-46-A2-DOMAIN-MODEL-INVARIANTS.md`
- `docs/11-step-history/STEP-46-A3-POSTGRES-RBAC.md`
- `docs/11-step-history/STEP-46-A4-CAMPAIGN-LIFECYCLE.md`
- `docs/11-step-history/STEP-46-A5-COUPON-ELIGIBILITY.md`
- `docs/11-step-history/STEP-46-A6-FIRST-PURCHASE-FESTIVAL.md`
- `docs/11-step-history/STEP-46-A7-PRICING-CART-CHECKOUT-INTEGRATION.md`
- `docs/11-step-history/STEP-46-A8-ORDER-REDEMPTION-FINANCIAL-INTEGRITY.md`

### A8 implementation
A8 binds Marketing Redemption to authoritative Commerce transactions. Checkout reservation creates `reserved` redemption rows from the immutable A7 marketing snapshot; abandoned/expired reserved Checkout releases them; Order creation consumes the exact reserved facts; Order cancellation/expiry reverses consumed rows without deleting history.

Promotion and coupon usage limits are concurrency-safe through PostgreSQL transaction advisory locks plus row locks. First-purchase reservations are additionally serialized by customer identity and revalidated against authoritative paid Order history, preventing two concurrent Checkouts from both claiming first-purchase eligibility.

Migrations `0039_marketing_redemption_integrity.sql` and `0040_marketing_redemption_runtime_hardening.sql` add Checkout/Order foreign keys, lifecycle immutability, state-transition guards, reserve/release/consume/reverse triggers and deferred financial integrity checks. Checkout/Order redemption counts and discount sums must match their immutable marketing snapshots.

### A8 canonical verification evidence
Verification-only Draft PR #13 tested the exact A8 `main` source; its branch added only a documentation CI marker and is not part of canonical source.

Final GitHub Actions Canonical CI run `32261752597`, job `verify` (`96096410165`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 362 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A8 tests: 11/11 PASS
- runtime tests: **184 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A8 FINAL GATE = PASS**
**A8 = COMPLETE**

### Next approved substep
**Step 46 / A9 — Customer Club / Points MVP Foundation**

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
