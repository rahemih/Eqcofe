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

Approved roadmap scope: configurable provider adapters for FX, SMS, email, shipping and auxiliary payment services with health status, retries/timeouts, secret boundaries and fail-closed behavior; FX must preserve preview-before-apply.

### Step 47 progress
- **A1 — Discovery + Integration Ownership / Rules Freeze — COMPLETE**
- **A2 — Common Provider Contracts + Failure Model — COMPLETE / FINAL GATE PASS**
- **A3 — Integration Configuration + Secrets + RBAC — COMPLETE / FINAL GATE PASS**
- **A4 — HTTP Client / Timeout / Retry / Circuit-Breaker Foundation — COMPLETE / FINAL GATE PASS**
- **A5 — Provider Health + Observability — COMPLETE / FINAL GATE PASS**
- **A6 — FX Provider Port + Rate Fetch — COMPLETE / FINAL GATE PASS**
- **A7 — FX Preview-before-Apply Integration — NEXT**
- A8 — SMS + Email Real Adapter Foundation — PLANNED
- A9 — Shipping Provider Foundation — PLANNED
- A10 — Auxiliary Payment Provider Foundation — PLANNED
- A11 — Security + Failure + Concurrency + E2E Regression — PLANNED
- A12 — Final Canonical Closure — PLANNED

Canonical Step-47 artifacts:
- `docs/11-step-history/STEP-47-A1-DISCOVERY-SCOPE.md`
- `docs/11-step-history/STEP-47-A2-PROVIDER-CONTRACTS-FAILURE-MODEL.md`
- `docs/11-step-history/STEP-47-A3-INTEGRATION-CONFIG-SECRETS-RBAC.md`
- `docs/11-step-history/STEP-47-A4-HTTP-RESILIENCE.md`
- `docs/11-step-history/STEP-47-A5-PROVIDER-HEALTH-OBSERVABILITY.md`
- `docs/11-step-history/STEP-47-A6-FX-PROVIDER-RATE-FETCH.md`

### Step 47 A6 verification evidence
PR #25 verified A6. Canonical CI run `32469549578`, job `verify` (`96733275878`) passed on the implementation source:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 396 module files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A6 tests: **7/7 PASS**
- runtime tests: **277 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

### Frozen Step-47 integration boundary
- `src/modules/integrations` remains the canonical integration bounded context.
- Notifications remains authoritative for SMS/email delivery semantics.
- Payments remains authoritative for payment/refund lifecycle and correctness.
- Fulfillment remains authoritative for shipment/fulfillment lifecycle.
- Pricing remains authoritative for currency-rate registration/selection and all product-price mutation; Integrations supplies FX observations only.
- FX provider observations use normalized three-letter source currency codes and target unit `TOMAN`.
- FX `rateToToman` is a positive safe integer and stale/future-invalid observations fail closed.
- Valid fetched FX observations are immutable append-only operational evidence.
- A6 does not activate automatic price mutation; preview-before-apply remains mandatory and is owned by A7 composition.
- Secret values remain environment-owned; only validated secret references may be persisted.
- Provider transport failures are normalized and fail closed.
- Every outbound provider request has a finite timeout.
- Retry attempts are bounded and write retries require idempotency.
- Retry backoff and `Retry-After` waits are capped.
- Provider circuit breakers fail closed while open and permit bounded half-open probes.
- Provider health checks are independent from business transactions.
- Health observations are append-only and current state is derived from the latest sample.
- Observability summaries expose state counts and latency without storing secret/config payloads.
- Production provider URLs require HTTPS.
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
