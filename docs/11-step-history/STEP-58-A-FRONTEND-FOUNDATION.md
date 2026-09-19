# Step 58-A — Canonical Handoff & Frontend Scope Freeze

**Foundation acceptance is defined by this document and becomes canonical only after the dedicated PR passes the required exact-head checks, Merge Policy, verified merge and post-merge verification. Stage B remains NOT_STARTED until that transport evidence is green.**

## خلاصه ساده

Step 58 ساخت Frontend واقعی EQCOFE را آغاز می‌کند، اما Stage A عمداً هیچ Frontend runtime، dependency، صفحه تجاری یا قابلیت Step 59 را ایجاد نمی‌کند. این Stage فقط وضعیت واقعی پروژه را از GitHub بازیابی، Driftهای هم‌زمان را reconcile، مرز Step 58 را قفل، معماری و معیارهای فنی را مشخص و مسیر A تا H را برای اجرای امن آماده می‌کند.

## Canonical handoff

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Initial live HEAD observed when Stage A started: `ce0ee9382f3b07f3a35d2f1a99601f7857e35869`
- Current rebased canonical base after concurrent governance merge: `4cfdf4a075e8838c35b5dd2b14836fdbd5b2ad34`
- Step 57 final state-sync merge: `f560a46d802da7668c7fb8ef79e7f55887f8f321`
- Step 57 implementation merge: `766904585dc601e36eec12c126e141efc4f6dc0a`
- Step 57 status: `CLOSED / FINAL GATE PASS`
- Step 58 status before this foundation: `NEXT / NOT_STARTED`
- Linear synchronization: `HOS-14 — Step 58 — Frontend Application Foundation`

### Post-Step57 drift reconciliation

Two later Multi-Agent pilot merges advanced `main` after Step 57 closure:

1. PR `#181` / merge `ce0ee9382f3b07f3a35d2f1a99601f7857e35869`: LOW-risk `DomainEventCollector` regression coverage plus its governance task/catalog.
2. PR `#184` / merge `4cfdf4a075e8838c35b5dd2b14836fdbd5b2ad34`: MEDIUM-risk verified token-telemetry readback plus its governance task/catalog/documentation.

Neither pilot introduces storefront/frontend runtime, product API, database, migration, dependency, pricing, payment, inventory, permission or roadmap implementation. PR #184 also explicitly excludes product runtime, API, database, migration, dependencies and canonical roadmap mutation. Therefore Step 57 closure remains valid; Stage A is rebased onto `4cfdf4a075e8838c35b5dd2b14836fdbd5b2ad34` so its generated governance catalog is exact against the current canonical baseline.

## Existing technical baseline

At Stage A handoff the canonical repository is still backend/application-contract focused:

- Node: `24.18.1`
- package manager: `pnpm@11.21.0`
- TypeScript: `6.0.3`
- backend: NestJS/Fastify modular monolith
- OpenAPI source: `contracts/http/openapi.yaml`
- generated TypeScript contract: `src/generated/openapi.ts`
- generation command: `pnpm contract:types`
- canonical verification: `contract:validate -> design:validate -> arch:check -> policy:check -> multi-agent:verify -> build -> test`
- dedicated canonical lint command: `NOT_CONFIGURED` at the Stage A baseline; no lint PASS may be claimed until Stage B introduces and verifies an explicit frontend/static-quality gate.
- production frontend package/application: not present at this handoff.

## Frozen product and UX contracts

All future Stage 58 implementation must preserve:

- Persian-first `fa-IR` and real RTL.
- all monetary values displayed/stored through authoritative contracts as integer Toman; no decimal money semantics.
- Wallet is prohibited.
- brown is prohibited as an EQCOFE Brand/UI palette color.
- Step 54 design tokens and the Step 57 behavioral/interaction baseline remain source contracts.
- presentation must remain replaceable; Business/Data/Auth layers may not depend on final visual composition.
- logical CSS properties, logical DOM/focus order in RTL, keyboard operation, visible focus, semantic HTML and skip navigation.
- minimum interactive target 44×44 CSS pixels.
- verification widths `320, 360, 600, 840, 1200, 1440` and 400% zoom/reflow.
- reduced-motion support, accessible forms/errors/status announcements and non-color-only meaning.
- Loading, Empty, Error, Forbidden, Offline and Recovery states must be representable.
- every inherited `NO_ACTION` restriction remains binding until an independently authorized backend/API/permission reconciliation closes it.

## Authority and security boundaries

Frontend is never authoritative for:

- authorization or permissions;
- payment result or payment success;
- pricing, discounts, profit or other financial calculations;
- inventory truth/reservation;
- server-side business lifecycle transitions.

The frontend must not store secrets, log sensitive tokens, invent backend capabilities, invent permissions or duplicate backend business rules. Auth/session behavior must fail closed and be based on the backend contract actually present when Stage E begins. API types must derive from OpenAPI/generated contracts rather than parallel handwritten domain DTOs.

## Technology decision for Stage B

### Selected application architecture

Use a **separate React storefront application using React Router Framework Mode on Vite, TypeScript, and SSR enabled by default**, integrated with EQCOFE only through the generated/validated HTTP API boundary.

### Why this is the Stage A decision

- React Router Framework Mode provides route-module type safety, code splitting, SPA/SSR/static rendering choices and server rendering without requiring EQCOFE business logic to move into the frontend framework.
- Vite remains a build layer; custom low-level Vite SSR is explicitly rejected because it would make EQCOFE own unnecessary framework plumbing.
- A pure browser-only SPA is rejected for the storefront because Step 58 must remain SEO-ready and later product/category/content pages need server/static rendering options.
- Next.js remains technically viable, but is not selected for this baseline because EQCOFE already has an authoritative standalone backend and the foundation benefits from a thinner application framework with less temptation to duplicate server/business logic in framework-specific server actions.
- This decision is not a hosting/vendor commitment. No paid service and no Vercel dependency is introduced.

### Guardrail

Stage B may pin concrete package versions only after checking compatibility with Node 24.18.1, pnpm 11.21.0 and TypeScript 6.0.3 at implementation time. Package versions are intentionally not frozen in Stage A.

## Step 58 execution plan

### A — Canonical Handoff & Frontend Scope Freeze

**Scope:** live canonical recovery, drift analysis/reconciliation, frontend/non-frontend boundary, architecture decision, inherited contract freeze, A-H plan and governance task registration.

**Definition of Done:**
- live `main` and all post-Step57 drift observed during execution verified;
- Step57 closure and Step58 pre-start status proven from canonical evidence;
- Stage58 scope/non-scope frozen;
- selected frontend architecture and decision rationale recorded;
- inherited security, RTL, Toman, no-Wallet, no-brown, accessibility/responsive and NO_ACTION contracts recorded;
- Stage A task contract exists;
- dedicated branch/PR only; no direct `main` mutation;
- exact-head `verify`, `phase-a`, and `merge-policy` checks green;
- merge and exact-SHA post-merge verification green before A is called canonically complete;
- Stage B remains untouched.

**Primary risks:** stale handoff evidence; concurrent Multi-Agent pilot merges; accidental Step59 scope bleed; invented API/auth/permission capability; premature framework dependency changes.

### B — Frontend Workspace & Build Foundation

**Scope:** create the storefront workspace/application, pin compatible dependencies, build/dev/type-check/static-quality scripts, environment boundaries and CI wiring.

**Definition of Done:** clean install/build/type-check/static-quality pass; no homepage/product/checkout feature implementation; backend canonical verification remains green; free/open-source dependencies only.

**Primary risks:** dependency/toolchain incompatibility, root-package coupling, CI regression and falsely claiming a lint gate that does not yet exist.

### C — Application Shell / Routing / RTL / i18n

**Scope:** replaceable application shell, router, route placeholders, `fa-IR`/RTL root semantics, i18n architecture, design-token bridge, responsive/accessibility shell primitives.

**Definition of Done:** route/RTL/i18n/shell tests pass across required widths and keyboard/focus baseline; placeholders only for future Step59+ feature routes.

**Primary risks:** hard-coded LTR assumptions, presentation/business coupling and Step59 leakage.

### D — API Client & Server Data Foundation

**Scope:** generated OpenAPI client boundary, request/config abstraction, typed transport errors and server-data ownership/caching strategy.

**Definition of Done:** generation/drift check pass; no handwritten duplicate API DTO authority; no frontend-owned pricing/inventory/financial calculations; retry/cache rules documented and tested.

**Primary risks:** contract drift, duplicated authoritative logic, stale cache semantics and unsafe retry of mutations.

### E — Auth / Session / Security Boundary

**Scope:** backend-compatible session/auth foundation, protected-route state representation, fail-closed handling and safe token/credential boundaries.

**Definition of Done:** auth/session boundary tests pass; no secret/client-only authorization authority; Forbidden/expired/recovery paths represented; backend remains authoritative.

**Primary risks:** token leakage, client-side permission invention, auth loops and assumptions not supported by backend contracts.

### F — State / Errors / Loading / Offline-Recovery Foundation

**Scope:** minimal application state policy and reusable Loading/Empty/Error/Forbidden/Offline/Recovery primitives with safe retry behavior.

**Definition of Done:** deterministic state transitions and recovery tests pass; mutation retries cannot silently duplicate irreversible actions; presentation remains replaceable.

**Primary risks:** over-global state, unsafe optimistic authority, double submission and hidden business logic in UI state.

### G — Testing / Accessibility / Responsive / Quality Gates

**Scope:** frontend unit/routing/RTL/responsive/accessibility/API/auth quality gates plus integration into canonical verification.

**Definition of Done:** install, frontend build, type-check, configured lint/static-quality, unit, routing, RTL, responsive, accessibility baseline, API-generation/check and auth/session tests pass; backend `pnpm verify` and Phase A verification remain green.

**Primary risks:** flaky browser tests, superficial accessibility checks and CI runtime inflation.

### H — Full Verification & Canonical Closure

**Scope:** full Step58 regression/audit, exact-head CI, Merge Policy, post-merge verification and canonical state/Linear closure.

**Definition of Done:** every Step58 gate green with exact evidence; zero unauthorized Step59 implementation; current state/roadmap/Linear synchronized; Step59 only becomes next after Step58 is canonically closed.

**Primary risks:** closure based on stale head, missing post-merge proof, hidden scope drift and premature Step59 start.

## Explicitly out of Stage 58-A

- no frontend runtime/package/dependency mutation;
- no homepage/header/hero commercial implementation;
- no product listing/product detail/compare/cart/checkout/account/wholesale/content feature implementation;
- no Admin frontend;
- no backend/API/database/migration/permission/business-rule change;
- no paid tool/service dependency;
- no visual lock beyond inherited contract requirements.

## Gate verdict before transport

`HANDOFF CONTENT: PASS`

Canonical completion is intentionally conditional on immutable GitHub transport evidence. Until the Stage A PR reaches verified merge plus post-merge verification, the correct state is:

- Step 58: `IN_PROGRESS — A transport pending`
- Stage A: `FOUNDATION CONTENT READY / CANONICAL GATE PENDING`
- Stage B: `NOT_STARTED`
