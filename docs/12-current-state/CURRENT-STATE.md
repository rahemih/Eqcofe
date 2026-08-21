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
- **A9 — Shipping Provider Foundation — COMPLETE / FINAL GATE PASS**
- **A10 — Auxiliary Payment Provider Foundation — COMPLETE / FINAL GATE PASS**
- **A11 — Security + Failure + Concurrency + E2E Regression — COMPLETE / FINAL GATE PASS**
- **A12 — Final Canonical Closure — NEXT**

### Step 47 A11 verification evidence
PR #32 verified the A11 composition/security/regression gate. Canonical CI run `32475315265`, job `verify` (`96750325586`) passed:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 402 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A11 dedicated tests: **15/15 PASS**
- runtime tests: **323 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

### Frozen Step-47 integration boundary
- `src/modules/integrations` is the canonical external integration bounded context.
- Notifications remains authoritative for SMS/email recipient resolution, rendering and delivery lifecycle.
- Fulfillment remains authoritative for shipment/tracking persistence and shipment lifecycle.
- Payments remains authoritative for initiate/verify/reconcile/refund/webhook handling and all payment-state transitions.
- Integrations may expose `payment_aux` inquiry/command observations only; those observations are not authoritative payment outcomes.
- Integrations owns external provider configuration, environment secret resolution and resilient transport behavior.
- Pricing remains authoritative for product price mutation; FX providers supply observations only.
- Secret values remain environment-owned; only validated secret references may be persisted.
- Provider transport failures are normalized and fail closed.
- Production provider URLs require HTTPS.
- FX refresh registers the observation in Pricing and returns a mandatory impact preview; price apply remains separate, Step-Up and idempotent.
- External write retries require idempotency; circuit-breaker and timeout behavior are bounded.
- Generic integration services must not hard-code provider vendors.

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
