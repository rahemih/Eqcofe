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
- **Step 47 — External Integration Foundation — CLOSED / FINAL GATE PASS**

## Active step
**Step 48 — EQCOFE AI Backend Foundation — ACTIVE**

### Step 48 progress
- **A1 — Discovery / Requirements / Ownership Freeze — COMPLETE**
- **A2 — Provider-Agnostic AI Contracts + Failure Model — COMPLETE / FINAL GATE PASS**
- **A3 — Governed Prompt Model + Persistence + Governance Controls — COMPLETE / FINAL GATE PASS**
- **A4 — AI Provider Configuration / Adapter Boundary + Secrets / Resilience Integration — NEXT**

### Step 48 A3 verification evidence
PR #36 establishes the governed-prompt persistence/governance gate. Implementation head `663d709e90c25bf77cb867ea5e22d9441ef8e0a0` passed Canonical CI run `32480383438`, job `verify` (`96765233896`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 407 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A3 dedicated tests: **6/6 PASS**
- runtime tests: **332 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A3 adds forward-only migration `0045_ai_governed_prompts.sql`, immutable prompt-version history, staff-only governance, optimistic concurrency and operation-bound active resolution. It adds no provider adapter/vendor SDK, provider secret persistence, Product Q&A HTTP API, Content generation integration, cost/rate implementation, or commerce mutation authority. Final documentation/current-state head must also pass Canonical CI before PR #36 is merged to `main`.

### Step 48 A2 verification evidence
PR #35 establishes the provider-neutral AI contract/failure-model gate. The implementation head `69c591cfc80b85fe681660738207e9036afa425d` passed Canonical CI run `32479583308`, job `verify` (`96762878114`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 404 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A2 dedicated tests: **3/3 PASS**
- runtime tests: **326 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A2 adds no database migration, OpenAPI surface, vendor SDK, provider adapter, prompt persistence, Product Q&A endpoint, Content integration or cost/rate persistence.

### Step 48 A1 frozen boundary
- `src/modules/ai` is the canonical AI bounded context and is already registered through `DomainModulesModule`; before Step 48 it contains only the module shell/placeholders.
- AI owns provider-neutral AI contracts/orchestration, governed prompt identity/versioning, product-Q&A orchestration, draft-generation orchestration, AI usage/cost/rate metadata and prompt/data-boundary enforcement.
- Catalog remains authoritative for product facts; Product Q&A is read-only and may consume only an explicit allowed Catalog context.
- Content remains authoritative for draft persistence, editorial lifecycle, approval and publication; AI may propose/generate draft content but cannot approve or publish it.
- Integrations remains authoritative for external provider configuration/secret resolution and resilient transport primitives established in Step 47. AI-specific provider contracts remain in AI and must stay vendor-neutral.
- AI has no authority to mutate Pricing, Inventory, Cart/Checkout, Orders, Payments, Refunds, Finance, permissions, secrets or administrative state.
- Model output is untrusted application input; prompt injection cannot confer authorization or override business/security rules.
- Provider payloads must be data-minimized/allow-listed; secrets and unrelated sensitive commerce/customer data must not be disclosed to providers.
- Generated content requires human approval through Content-owned workflows.
- Server-side rate/cost controls and safe observability are required; raw secret/prompt leakage through logs is forbidden.
- Step 48 adds only forward-only persistence when required; existing migrations are not rewritten.
- General-purpose autonomous agents, arbitrary tool execution, autonomous commerce mutations, model training/fine-tuning and unrelated AI expansion are outside Step-48 scope.

### Step 47 final closure
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
- **A12 — Final Canonical Closure — COMPLETE / FINAL GATE PASS**

### Step 47 final verification evidence
A11 PR #32 established the implementation/security/regression gate. Canonical CI run `32475315265`, job `verify` (`96750325586`) passed:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 402 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A11 dedicated tests: **15/15 PASS**
- runtime tests: **323 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A12 is documentation/canonical-state closure only. It introduces no new business feature, schema, runtime integration or ownership change. A12 is considered closed only after Canonical CI passes on its exact closure branch and the closure PR is merged into `main`.

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
