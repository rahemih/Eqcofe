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
- **A4 — AI Provider Configuration / Adapter Boundary + Secrets / Resilience Integration — COMPLETE / FINAL GATE PASS**
- **A5 — Product Q&A Orchestration + Safe Catalog Context — COMPLETE / FINAL GATE PASS**
- **A6 — Draft Content Generation + Human Approval Boundary — COMPLETE / FINAL GATE PASS**
- **A7 — AI Usage / Cost / Rate Controls — COMPLETE / FINAL GATE PASS**
- **A8 — Safe AI Observability — COMPLETE / FINAL GATE PASS**
- **A9 — AI Security / RBAC / API Boundary + Regression Gate — NEXT**

### Step 48 A8 verification evidence
PR #41 establishes safe append-only AI invocation observability. Implementation head `ce6fc4995ab9d5a36c62d0ca68fbdcabcc675cd7` passed Canonical CI run `32484720074`, job `verify` (`96778556640`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 414 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A8 dedicated tests: **6/6 PASS**
- runtime tests: **363 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A8 adds forward-only migration `0048_ai_safe_observability.sql`, append-only invocation observations and bounded operational summaries. Stored observability data is limited to safe metadata: request id, operation, governed prompt identity/version, normalized outcome/failure kind, bounded model identifier, token counts, latency and timestamp. Raw prompts, user questions, Catalog context, content briefs, generated response bodies, provider payloads and secrets are not persisted. Product Q&A and Draft Content generation both record success/provider-failure/application-failure outcomes. No public AI HTTP endpoint or commerce/admin mutation authority is introduced.

### Step 48 A7 verification evidence
PR #40 establishes server-side AI usage, cost and rate controls. Implementation head `f4b644de8434428975ca4d5ae6ec2847e1171206` passed Canonical CI run `32483996493`, job `verify` (`96776325010`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 412 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A7 dedicated tests: **7/7 PASS**
- runtime tests: **357 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A7 adds forward-only migration `0047_ai_usage_cost_rate_controls.sql`, provider-neutral per-operation usage policies, atomic reservation before provider execution, request/minute and token ceilings, integer micro-cost daily budgets, and explicit success/failure settlement. Both Product Q&A and Draft Content generation are gated before provider execution. A7 adds no public AI HTTP endpoint, vendor-specific pricing contract, autonomous business mutation or unrelated dependency.

### Step 48 A6 verification evidence
PR #39 establishes governed AI draft generation while preserving Content-owned editorial authority. Implementation head `8083244637c2d3862e886fe518f748a0ee4d4b8f` passed Canonical CI run `32483061869`, job `verify` (`96773456625`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 410 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A6 dedicated tests: **6/6 PASS**
- runtime tests: **350 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A6 adds `DraftContentGenerationService`, resolves the active governed `draft-content` prompt, treats briefs as untrusted input, validates a strict generated-article JSON schema and persists only through Content-owned `ArticleDraftService`. Generated output must remain `draft` and explicitly requires human approval. AI never calls Content approval, scheduling or publication services and has no direct Content persistence or commerce mutation authority. A6 adds no database migration, public AI HTTP endpoint or new runtime dependency. The closed A5 import assertion was minimally made additive so the A5 ownership invariant remains valid as ContentModule is legitimately added; no test was removed or disabled.

### Step 48 A5 verification evidence
PR #38 establishes the read-only Product Q&A orchestration boundary. Implementation head `c36541e302fead49c5733a09b5e470c67df7e537` passed Canonical CI run `32482001230`, job `verify` (`96770193953`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 409 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A5 dedicated tests: **6/6 PASS**
- runtime tests: **344 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A5 adds `ProductQaService`, consumes only exported Catalog queries, resolves the active governed `product-qa` prompt, supports Persian/Unicode product slugs, sends an explicit allow-listed product context, separates governed instructions from authoritative context and untrusted user questions, and fails closed on provider/output errors. Price, internal IDs/SKU and unrelated/internal fields are excluded from provider context. A5 adds no database migration, public HTTP endpoint, Content generation integration, autonomous tool execution or commerce mutation authority. A prior A4 test was minimally updated to preserve its IntegrationsModule-import invariant while allowing the additive CatalogModule import; no test was deleted or disabled.

### Step 48 A4 verification evidence
PR #37 establishes the AI provider configuration/adapter boundary. Implementation head `287b2dacd3f6afd3ba902d57f357b7517b263f91` passed Canonical CI run `32481083286`, job `verify` (`96767380130`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 408 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A4 dedicated tests: **6/6 PASS**
- runtime tests: **338 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A4 adds forward-only migration `0046_integration_ai_provider_kind.sql`, extends the existing Integrations provider kind with `ai`, and adds a vendor-neutral configured AI text-generation adapter that reuses Integrations-owned configuration, environment secret resolution, timeout/retry/idempotency and circuit-breaker transport. Raw secrets remain environment-owned. No Product Q&A HTTP API, Content generation integration, autonomous business mutation, or parallel credential store is introduced. An initial CI attempt failed because `halfOpenMaxCalls` was missing from the circuit-breaker policy; that defect was corrected before the successful gate above.

### Step 48 A3 verification evidence
PR #36 establishes the governed-prompt persistence/governance gate. Implementation head `663d709e90c25bf77cb867ea5e22d9441ef8e0a0` passed Canonical CI run `32480383438`, job `verify` (`96765233896`):
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 407 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A3 dedicated tests: **6/6 PASS**
- runtime tests: **332 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

A3 adds forward-only migration `0045_ai_governed_prompts.sql`, immutable prompt-version history, staff-only governance, optimistic concurrency and operation-bound active resolution. It adds no provider adapter/vendor SDK, provider secret persistence, Product Q&A HTTP API, Content generation integration, cost/rate implementation, or commerce mutation authority.

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
