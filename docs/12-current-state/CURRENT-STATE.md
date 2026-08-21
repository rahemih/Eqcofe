# EQCOFE Current State

## Trusted state date
**2026-08-21**

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

### Step 47 progress
- **A1 — Discovery + Integration Ownership / Rules Freeze — COMPLETE**
- **A2 — Common Provider Contracts + Failure Model — COMPLETE / FINAL GATE PASS**
- **A3 — Integration Configuration + Secrets + RBAC — COMPLETE / FINAL GATE PASS**
- **A4 — HTTP Client / Timeout / Retry / Circuit-Breaker Foundation — COMPLETE / FINAL GATE PASS**
- **A5 — Provider Health + Observability — COMPLETE / FINAL GATE PASS**
- **A6 — FX Provider Port + Rate Fetch — COMPLETE / FINAL GATE PASS**
- **A7 — FX Preview-before-Apply Integration — COMPLETE / FINAL GATE PASS**
- **A8 — SMS + Email Real Adapter Foundation — COMPLETE / FINAL GATE PASS**
- **A9 — Shipping Provider Foundation — NEXT**
- A10 — Auxiliary Payment Provider Foundation — PLANNED
- A11 — Security + Failure + Concurrency + E2E Regression — PLANNED
- A12 — Final Canonical Closure — PLANNED

Canonical Step-47 artifacts include `docs/11-step-history/STEP-47-A8-SMS-EMAIL-ADAPTER-FOUNDATION.md` and all preceding A1–A7 records.

### Step 47 A8 verification evidence
PR #29 verified the A8 implementation. Canonical CI run `32471231262`, job `verify` (`96738236635`) passed on corrected A8 source:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 398 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A8 dedicated tests: **8/8 PASS**
- runtime tests: **292 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

### Frozen Step-47 integration boundary
- `src/modules/integrations` is the canonical external integration bounded context.
- Notifications remains authoritative for SMS/email recipient resolution, rendering, delivery lifecycle, attempts, retry scheduling, dead-letter, audit and outbox.
- Integrations owns SMS/email provider configuration, environment secret resolution and resilient external HTTP adapter behavior.
- No SMS/email vendor is hard-coded or selected by A8.
- Outbound provider sends are idempotent writes with finite timeout, bounded retry and circuit breaker.
- Payments remains authoritative for payment/refund lifecycle and correctness.
- Fulfillment remains authoritative for shipment/fulfillment lifecycle.
- Pricing remains authoritative for product price mutation; FX providers supply observations only.
- Secret values remain environment-owned; only validated secret references may be persisted.
- Provider transport failures are normalized and fail closed.
- Production provider URLs require HTTPS.
- FX refresh registers the observation in Pricing and returns a mandatory impact preview; price apply remains separate, Step-Up and idempotent.

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
