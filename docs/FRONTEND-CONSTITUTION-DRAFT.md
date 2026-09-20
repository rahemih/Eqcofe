# EQCOFE Frontend Constitution Draft

Status: DRAFT / NON-ENFORCING
Applies to: Existing Storefront foundation and future EQCOFE frontend work
Enforcement: NONE
Reviewed canonical baseline: `d6ccf594acc3997c31d8c8ec4afd817249650a95`
Activation requires: Separate governed PR and explicit approval

> This document is advisory only. It does not authorize repository restructuring, dependency installation, CI enforcement, authentication changes, cookie changes, migration changes, or frontend implementation.


## 1. Purpose

This draft records durable frontend principles aligned with EQCOFE's **current canonical Storefront foundation** and with future frontend work. It is deliberately non-enforcing: it documents boundaries and defaults but does not change runtime behavior, install dependencies, modify CI, or authorize Step 59 implementation.

Framework-independent authority rules remain the primary purpose of this document. Framework-specific facts below describe the reviewed canonical baseline so that future work does not repeat stale assumptions. Any later framework, deployment, authentication, or policy change still requires its own roadmap-aligned Task Contract, review and verification.


## 2. Canonical alignment

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Reviewed baseline: `d6ccf594acc3997c31d8c8ec4afd817249650a95`
- Roadmap version: `3.50 — Step-58 Final Canonical Closure`
- Current execution position: **Step 58 — Frontend Application Foundation — CLOSED / FINAL CANONICAL PASS**.
- Active step/substep: **NONE**.
- Next approved step: **Step 59 — NEXT / NOT_STARTED**.
- The Storefront application exists at `apps/storefront`.
- At this reviewed baseline the Storefront uses React 19.3.0, React Router 8.4.0 and Vite 8.3.0.
- The Storefront foundation already includes routing/shell, `fa-IR` RTL/i18n, API/server-data boundaries, auth/session/security boundaries, loading/error/offline recovery and verified static/SSR/browser quality gates.
- Existing Storefront verification includes typecheck, ESLint/static quality, production build, shell verification, API-boundary verification, auth-boundary verification, state-foundation verification and static quality checks; Step 58-G also closed browser quality coverage.
- Backend/API remains authoritative for authentication, authorization, pricing, discounts, inventory, payment, profit and business state transitions.
- Toman remains the financial unit, Wallet remains absent, and brown remains prohibited in the brand/UI palette.

The root package may still identify the backend/application core separately; that does **not** imply the repository lacks a frontend. This document does not alter roadmap state, reopen Step 58, start Step 59, or certify any feature beyond the already-verified canonical foundation.

## 3. Requirement levels

- **MUST** — a durable principle applicable to the current Storefront and future EQCOFE frontend work.
- **SHOULD** — a recommended default that may be changed when documented constraints justify an alternative.
- **DECISION REQUIRED** — a deferred choice that must not be implemented until the responsible roadmap gate records an architecture or product decision.

An undecided additional framework, tool, topology, provider, or deployment model must never be treated as a MUST. Existing canonical Storefront choices remain descriptive facts until changed through a governed task.

## 4. Design tokens

### MUST

- Repeated visual design values must originate from the canonical EQCOFE design-system contract.
- Generated artifacts must not be edited by hand.
- A token change must begin in the canonical contract and pass through the existing generator and drift checks.
- Frontend code must consume semantic tokens where an applicable token exists.

Canonical source and generation boundary at this baseline:

- Contract: `docs/13-product-design/step54-design-system-contract.json`
- Generator: `scripts/generate-step54-repository-library.mjs`
- Generated CSS: `docs/13-product-design/generated/eqcofe-design-tokens.css`

Examples of existing EQCOFE variables:

```css
color: var(--eq-color-text-primary);
background: var(--eq-color-action-primary);
padding-inline: var(--eq-spacing-4);
border-radius: var(--eq-radius-md);
```

### SHOULD

- Prefer semantic tokens over raw palette tokens in application components.
- Add a missing reusable design value to the canonical contract rather than duplicating it across components.

### DECISION REQUIRED

- Whether tokens will be published as a workspace package, generated into each application, or consumed through another build-time boundary.
- Whether Storefront, Admin and any future Landing application share a component package in addition to token contracts.

This draft does not authorize moving, editing or repackaging tokens.

## 5. Hard-coded style values

### MUST

- Repeated product-design values must use an applicable token.
- Fixed inline styles must not become a parallel design system.
- Any future automated restriction must support a small documented allowlist and must be proven in reporting mode before it can block CI.

### Allowed technical exceptions

Direct values may be justified for technical rather than product-design purposes, including:

- zero values;
- one-pixel rendering boundaries when no applicable token exists;
- SVG coordinates and intrinsic dimensions;
- computed or data-driven values;
- responsive calculations;
- browser compatibility fixes;
- values required by a third-party protocol or external contract.

### DECISION REQUIRED

- Linter selection, rule implementation, allowlist format and enforcement threshold.
- Any new framework-specific lint/utility enforcement beyond current verified quality gates.

No linter, hook, dependency or CI rule is activated by this draft.

## 6. Persian-first RTL behavior

### MUST

- Layout behavior must be designed and tested for `fa-IR` and RTL.
- Prefer logical properties and `start`/`end` semantics where direction should follow the document.
- Focus order must follow meaningful reading and interaction order.
- Mixed Persian/Latin identifiers, Toman values and copyable machine identifiers must preserve the canonical numeral and formatting rules.
- Forms, tables, drawers, pagination, breadcrumbs, overlays and navigation must have explicit RTL acceptance coverage.

### SHOULD

- Use physical `left` and `right` only when physical direction is genuinely part of the requirement.
- Prefer platform semantics over manual visual reversal.

### DECISION REQUIRED

- Changes to the current React Router/Vite RTL implementation, or introduction of Tailwind/another utility framework, require a separate reviewed decision. This draft does not add Tailwind.

## 7. Accessibility

EQCOFE's existing design-system target is WCAG 2.2 AA.

### MUST

- Use semantic HTML before adding ARIA.
- Support keyboard access and visible focus for interactive controls.
- Give controls accessible names and associate validation messages with their fields.
- Preserve meaningful heading and landmark structure.
- Do not communicate required meaning by color alone.
- Respect reduced-motion preferences.
- Keep critical flows usable at 400% zoom.
- Include screen-reader and RTL behavior in acceptance criteria for critical journeys.

### SHOULD

- Treat the existing `--eq-size-touch-min` token as the current design-system reference for touch sizing where applicable.
- Include automated checks and manual assistive-technology review in the existing and future testing strategy.

### DECISION REQUIRED

- Accessibility tooling, browser matrix, assistive-technology matrix and CI thresholds.

No accessibility dependency or gate is installed by this draft.

## 8. Environment variables and secrets

### MUST

- Secrets must never be included in a browser-delivered bundle.
- Public frontend variables must contain only values safe for any user to inspect.
- Production credentials, signing secrets, database credentials, private API tokens, encryption keys and webhook secrets must remain server-side.
- Example environment files must contain names and non-sensitive examples only.

### SHOULD

- Document which configuration values are public, server-only or deployment-owned when the frontend foundation is selected.
- Add secret detection only through a separate reviewed change with an understood false-positive policy.

### DECISION REQUIRED

- Any new public-variable prefix or validation convention beyond the current Storefront build configuration must be documented before use. Names such as `VITE_` and `NEXT_PUBLIC_` are examples, not authorization by this draft.
- Changes to frontend configuration loading and validation strategy.


## 9. Authentication, cookies and sessions

Step 58-E established and verified the Storefront auth/session/security boundary. This draft **does not redefine that boundary** and does not treat authentication as unimplemented.

### MUST

- Authentication and authorization decisions remain server-authoritative.
- Existing Storefront auth/session behavior must remain compatible with the canonical Step 58-E boundary unless a dedicated security change explicitly replaces it.
- Cookie, session, CORS or CSRF behavior must not change without a dedicated architecture and security review.
- Protected mutations must preserve canonical authentication, authorization, Step-Up, audit and idempotency boundaries.
- Browser-visible errors must not disclose sensitive authentication or internal diagnostic data.

### Required audit before changing the current boundary

Any future change must evaluate, as applicable:

- Storefront, Admin and any Landing domains;
- preview and staging environments;
- payment and identity callbacks;
- CSRF threat model;
- cookie host/domain scope;
- `SameSite`, `Secure` and `HttpOnly` requirements;
- SSO requirements;
- token storage and refresh behavior;
- logout and session-revocation behavior.

### DECISION REQUIRED

- Any change to cookie name/prefix, host/domain scope or `SameSite` mode;
- any change to subdomain topology or cross-application session sharing;
- any new SSO/session-sharing requirement.

This draft does not modify `__Host-`, `Domain`, `SameSite`, CORS, CSRF, SSO or session configuration.

## 10. Landing architecture

### MUST

- A future marketing or campaign surface must not silently acquire authority over authenticated commerce or administrative mutations.
- Public surfaces must use explicit, least-privilege API boundaries.
- Attribution parameters must be bounded and validated before use.

### SHOULD

- Keep deployment and failure boundaries for rapidly changing campaign experiences from destabilizing checkout, payment or authenticated account journeys.

### DECISION REQUIRED

The following is an option for a future architecture decision, not an approved structure:

```text
apps/storefront
apps/admin
apps/landing
packages/design-tokens
packages/ui
```

Monorepo multi-app, a separately deployed application in the same repository, and a separate repository must be compared against operational, security and ownership needs before selection. This draft creates no application, folder or package.


## 11. Testing strategy

### Current verified Storefront gates

At the reviewed baseline, `apps/storefront` already has executable verification for:

- type generation and TypeScript typecheck;
- ESLint/static quality;
- production build;
- shell/routing foundation;
- API/server-data foundation;
- auth/session boundary;
- loading/error/offline state foundation;
- static quality checks;
- terminal browser-quality verification established by Step 58-G.

These gates are existing canonical behavior. This draft does not weaken, remove, rename or replace them.

### MUST

- Tests must verify observable behavior and critical contracts, not only implementation details.
- Security-sensitive and transactional flows must include failure, denial and recovery paths where applicable.
- New frontend work must extend the existing verification model rather than bypassing it.
- A test or policy must not be removed, skipped or weakened merely to obtain a passing build.

### Additional layers when required by feature scope

- unit;
- component interaction;
- integration;
- API contract;
- end-to-end;
- accessibility;
- visual regression;
- performance.

### DECISION REQUIRED

- Any new test runner or component-testing library beyond the current canonical toolchain;
- additional E2E or visual-regression tooling/services;
- expanded browser/device matrix;
- ownership and CI execution policy for newly introduced test layers.

Tool names such as Vitest, React Testing Library, Playwright or Cypress are not authorized merely by appearing in this document. Any addition requires a separate governed change.

## 12. Payment testing

### MUST

- Real customer payment data and production credentials must never be used in automated tests.
- Payment UI tests must preserve provider-independent, idempotent and fail-closed backend behavior.
- Successful, failed, duplicate, timeout, unknown-result and recovery paths must be covered when implementation reaches the applicable roadmap gate.

### SHOULD

- Use an official provider sandbox, a controlled fake adapter or contract tests according to the canonical integration architecture.

Payment testing is deferred to the applicable frontend and real-provider steps; this draft runs no payment test and changes no provider configuration.

## 13. Loading and error states

Applicable screen and component acceptance criteria should explicitly consider:

- initial;
- loading;
- success;
- empty;
- partial data;
- validation error;
- unauthorized;
- forbidden;
- not found;
- conflict;
- rate limited;
- offline;
- retry;
- stale data.

### MUST

- Error feedback must be understandable and actionable without exposing sensitive diagnostics.
- Retrying a non-idempotent mutation must not be automatic unless the authoritative contract makes it safe.
- Loading states must avoid unnecessary layout instability in critical flows.

This draft adds no UI implementation.

## 14. Performance

Current and future performance measurement should cover LCP, INP, CLS, route loading and bundle size where the applicable feature and deployment surface make those metrics meaningful.

### MUST

- Performance budgets must be derived from a measured frontend baseline before they can block CI.
- Above-the-fold or LCP media must not be blindly lazy-loaded.
- Images must preserve dimensions or aspect ratio to limit layout shift.

### SHOULD

- Lazy-load suitable offscreen media.
- Limit font files and weights and use an appropriate display strategy.
- Review bundle, maintenance, accessibility, security and RTL impact before adding a substantial UI dependency.

### DECISION REQUIRED

- Numeric budgets;
- measurement tooling;
- image component and optimization pipeline;
- font loading strategy;
- enforcement thresholds.

No performance budget or gate is activated by this draft.

## 15. Runtime version management

At the reviewed baseline, the repository declares:

```text
Node.js: 24.18.1 in .nvmrc and .node-version; package engine >=24.18.1 <25
pnpm: 11.21.0
```

### MUST

- Runtime declarations and CI must remain mutually compatible.
- Runtime upgrades or downgrades require a separate scoped PR and verification.

This draft does not modify runtime versions, package metadata, lockfiles or workflows.

## 16. Git workflow principles

### MUST

- Work from the current canonical `main` in a scoped branch.
- Keep PR scope reviewable and preserve unrelated work.
- Use a commit type that reflects the change, such as `feat`, `fix`, `test`, `docs`, `refactor` or `chore`.
- Require applicable exact-head checks before merge and verify post-merge CI.
- Do not force-push shared canonical history.
- Do not change `main` directly.

### SHOULD

- Include the roadmap step or substep in the commit scope when useful for provenance.
- Create tags for releases or material milestones, not automatically for every substep.


## 17. Additional enforcement plan

Step 58 already established executable Storefront quality gates. The sequence below applies only to **new or stricter constitution-driven enforcement** and is advisory until separately approved:

1. map the proposed rule to the current canonical Storefront architecture and roadmap scope;
2. prove that the rule does not conflict with existing Step 58 verification;
3. define a narrow allowlist/exception model where necessary;
4. run the candidate rule in reporting mode when practical;
5. measure false positives, maintenance cost and CI execution cost;
6. add or update tests that demonstrate the intended behavior;
7. document rollback and failure handling;
8. activate the rule only in a separate governed PR after all required gates pass.

Nothing in this sequence is executed or authorized by this document.


## 18. Activation gate

This document remains **DRAFT / NON-ENFORCING** even though Step 57 and Step 58 are now closed. Historical prerequisites being satisfied does not automatically activate this constitution.

Any future enforcing version requires a separate governed change that verifies all applicable conditions:

- the current canonical Storefront foundation remains green;
- the proposed rule is mapped to the actual React Router/Vite/React architecture or to an explicitly approved successor;
- authentication, cookie and CSRF implications are reviewed when relevant;
- design-token integration remains aligned with canonical product-design contracts;
- test and quality tooling impact is measured;
- any new blocking policy has a demonstrated false-positive/exception strategy;
- CI execution time and maintenance cost are assessed;
- the exact enforcing change receives required REVIEW / SECURITY / HUMAN / LOCK gates according to its classified risk;
- the owner explicitly authorizes activation when a Human Gate is required.

Until such a separate activation change is merged and post-merge verified:

```text
Status: DRAFT / NON-ENFORCING
Enforcement: NONE
```

## 19. Non-authorization summary

This draft does not authorize:

- additional frontend feature implementation;
- framework/tool replacement or additional framework selection;
- repository restructuring;
- dependency installation;
- CI or pre-commit enforcement;
- design-token changes;
- runtime-version changes;
- authentication, cookie, CORS or CSRF changes;
- API or OpenAPI changes;
- migrations;
- deployment;
- roadmap, Linear or Figma mutations.

Every future implementation or enforcement item requires its own roadmap-aligned scope, review, verification and approval.
