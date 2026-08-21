# EQCOFE Step 48 / A1 — Discovery, Requirements & Ownership Freeze

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A1 — Discovery / Requirements / Ownership Freeze  
**Date:** 2026-08-21  
**Status:** COMPLETE

## 1. Canonical inputs

This A1 is grounded in the canonical repository `rahemih/Eqcofe`, branch `main`, `CURRENT-STATE.md`, `MASTER-ROADMAP.md`, `CHAT-HANDOFF.md`, Linear issue `HOS-6`, and verified Step-47 closure evidence.

Canonical Step-48 scope is limited to:
- provider-agnostic AI ports;
- governed prompts;
- product Q&A;
- draft content generation with human approval;
- cost/rate controls;
- observability;
- prompt/data-boundary security.

No additional AI product scope is introduced by A1.

## 2. Repository discovery

The repository already contains the bounded context `src/modules/ai` with the standard `application`, `domain`, `infrastructure`, and `presentation` directories. `AiModule` is already registered in `DomainModulesModule`, but the AI implementation is still only a module shell/placeholders. Step 48 must implement inside this existing boundary rather than create a competing AI module.

Relevant existing ownership and reusable capabilities:
- Catalog exposes read/query behavior separately from catalog command behavior; Catalog remains authoritative for product facts.
- Content already owns article draft and editorial services; Content remains authoritative for content persistence, editorial lifecycle, approval and publication.
- Integrations owns external-provider configuration, secret references, provider failure normalization, resilient HTTP transport, circuit breaking and provider-health infrastructure from Step 47.
- Admin already provides RBAC infrastructure and existing privileged-operation conventions.
- Existing commerce domains remain authoritative for their own state and must not be mutated by AI.

The current Step-47 `IntegrationProviderKind` is intentionally limited to `fx | sms | email | shipping | payment_aux`; A1 does not silently extend that union. AI-specific provider contracts belong to the AI bounded context. Reuse/extension of Integration transport/configuration must be explicit in implementation substeps and must preserve Step-47 invariants.

## 3. AI bounded-context ownership freeze

### AI owns
- Provider-neutral model/generation ports and AI-specific request/response contracts.
- AI orchestration for approved Step-48 use cases.
- Governed prompt definitions, immutable/versioned prompt identity and prompt selection policy.
- Product-Q&A orchestration over explicitly allowed authoritative product context.
- Draft-content generation orchestration.
- AI execution metadata required for auditability, usage, rate/cost controls and operational observability.
- AI-specific failure normalization above provider transport failures.
- Prompt/data-boundary validation and output-safety checks appropriate to these use cases.

### AI does not own
- Product/catalog mutation.
- Pricing or wholesale price mutation.
- Inventory or reservation mutation.
- Cart, Checkout or Order lifecycle mutation.
- Payment, refund, reconciliation or financial-state mutation.
- Customer permissions, roles or administrative authorization.
- Content publication or editorial approval.
- Secrets or raw provider credentials.
- External integration transport policy when that capability is already owned by Integrations.

## 4. Cross-domain ownership freeze

### Catalog
Catalog is the source of truth for product facts. Product Q&A may consume an explicit read-only context assembled from authorized Catalog read models. AI must not call Catalog command services as part of Q&A.

### Content
Content is the source of truth for article/content lifecycle. AI may generate a proposal/draft payload. Persistence into Content must use Content-owned application boundaries, and publication/approval remains a human-authorized Content operation. AI output can never directly publish content.

### Integrations
Integrations continues to own environment secret resolution, validated non-secret provider configuration, HTTPS production transport, finite timeouts, bounded retries/circuit breaking and provider-health primitives. AI provider adapters must remain vendor-neutral at the AI port boundary. Provider credentials remain environment-owned references; raw secrets are not persisted in AI data.

### Admin / Identity
Administrative AI configuration/governance operations require existing server-side authentication/RBAC conventions. Human approval actions are never inferred from model output.

### Commerce domains
Pricing, Inventory, Cart/Checkout, Orders, Payments, Finance, Notifications, Marketing and other closed domains remain authoritative. AI answers/generations are advisory or draft artifacts only and confer no mutation authority over those domains.

## 5. Frozen security rules

1. Model output is untrusted input to the application and must never be treated as authorization or executable business commands.
2. AI cannot directly change prices, stock, orders, payments, refunds, permissions, secrets or administrative state.
3. Product Q&A is read-only and must use an allow-listed authoritative context; arbitrary database access is forbidden.
4. Prompt injection from user text, catalog text or generated text must not be able to override system/business/security boundaries.
5. System/governance prompts, secret references, credentials and internal-only instructions must not be disclosed through Q&A or generation responses.
6. Raw secrets must not be stored in prompt records, execution records, logs or provider metadata.
7. Provider payload construction must use an explicit data allow-list/minimization policy; unrelated customer, payment, credential or internal operational data must not be sent to an AI provider.
8. Provider/network/model failures fail closed: no authoritative business mutation may occur because of an uncertain AI result.
9. Generated content must remain draft/unapproved until a human-authorized Content workflow accepts it.
10. Server-side rate and cost controls cannot be bypassed by client-supplied provider/model/token parameters.
11. Observability must prefer safe metadata and bounded/redacted text over uncontrolled raw prompt logging.
12. AI provider selection must not hard-code a production vendor into domain/application contracts.
13. Existing Toman-only financial policy and no-Wallet policy remain unchanged.

## 6. Data ownership and persistence requirements

A1 freezes the need for forward-only persistence in later implementation substeps where required. Existing migrations must not be rewritten.

AI-owned persistence may include only Step-48 needs such as:
- governed prompt definition/version metadata;
- AI execution/request metadata and normalized outcome;
- usage counters/measurements for rate and cost enforcement;
- safe observability/audit correlation metadata.

Content draft bodies/articles remain Content-owned data. Catalog product facts remain Catalog-owned data. Secrets remain environment-owned.

Any monetary cost persisted by Step 48 must comply with the project-wide integer-Toman policy. Provider-native token counts and non-monetary usage units may be stored as integer usage metrics, but must not be presented as authoritative financial amounts unless converted through an explicit governed Toman cost representation.

## 7. API requirements freeze

Later API work must follow existing EQCOFE conventions for validation, auth/RBAC, error contracts, OpenAPI and idempotency where applicable.

Minimum Step-48 surfaces implied by the canonical roadmap:
- a bounded Product Q&A operation using authoritative product context;
- protected draft-content generation for Content workflows;
- protected governance/operational surfaces only to the extent necessary for prompts, limits and observability.

A1 does not approve a general-purpose chat endpoint, arbitrary tool execution, autonomous agents, direct database querying or AI-admin mutation APIs.

## 8. Dependency requirements freeze

- Do not add a vendor SDK merely to satisfy A1.
- Provider-neutral contracts come before real provider adapters.
- Prefer the existing Step-47 integration transport/secret/failure infrastructure where compatible, without weakening its invariants.
- New dependencies require a demonstrated Step-48 need and must not be bundled with unrelated upgrades.

## 9. Out of scope for Step 48

Unless the canonical roadmap is explicitly changed later, Step 48 excludes:
- autonomous purchasing/order/payment/refund actions;
- autonomous pricing or inventory changes;
- autonomous content publication;
- generic agent/tool execution framework;
- vector database/RAG platform as a product in itself;
- broad recommendation/personalization engine;
- AI marketing automation;
- model training/fine-tuning pipeline;
- production vendor lock-in or vendor-specific business contracts;
- unrelated architecture redesign or cleanup.

## 10. Frozen Step-48 substep plan

- **A1** Discovery / Requirements / Ownership Freeze — COMPLETE
- **A2** Provider-Agnostic AI Contracts + Failure Model
- **A3** Governed Prompt Model + Persistence + Governance Controls
- **A4** AI Provider Configuration / Adapter Boundary + Secrets / Resilience Integration
- **A5** Cost / Rate Controls + Usage Observability
- **A6** Product Q&A — Authoritative Read-Only Context + API
- **A7** Draft Content Generation + Human Approval Integration
- **A8** Prompt/Data-Boundary Security + RBAC + Audit
- **A9** E2E + Failure + Security + Regression Verification
- **A10** Final Canonical Closure

The plan is intentionally limited to the official Step-48 roadmap. Substep names may be refined only when implementation evidence exposes a real dependency; scope may not expand silently.

## 11. A1 acceptance criteria

- Canonical Step-48 scope verified: PASS
- Existing AI bounded context discovered: PASS
- Existing AI implementation assessed as shell/placeholders: PASS
- Catalog/Content/Integrations/Admin ownership boundaries identified: PASS
- Business/security boundaries frozen: PASS
- Data ownership frozen: PASS
- API and DB requirements bounded: PASS
- Dependency rules frozen: PASS
- Out-of-scope list frozen: PASS
- Step-48 substep sequence frozen: PASS
- No production source code or schema changed in A1: PASS

## 12. Verification note

A1 is a discovery/requirements/documentation substep and introduces no runtime source, API contract or schema change. Therefore A1 does not claim a new runtime regression result. The verified Step-47 baseline remains the regression baseline until Step-48 implementation changes begin. Build/OpenAPI/architecture/policy/runtime gates become mandatory as applicable from implementation substeps onward.

## 13. Next safe action

Proceed to **Step 48 / A2 — Provider-Agnostic AI Contracts + Failure Model**. Define model/provider-neutral contracts and deterministic failure semantics before any provider adapter, database migration or product-facing endpoint is introduced.
