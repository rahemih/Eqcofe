# EQCOFE Frontend Constitution Draft

Status: DRAFT / NON-ENFORCING
Applies to: Future frontend implementation planning
Enforcement: NONE
Activation requires: Separate reviewed PR and explicit approval

> This document is advisory only. It does not authorize repository restructuring, dependency installation, CI enforcement, authentication changes, cookie changes, migration changes, or frontend implementation.

## 1. Purpose

This draft records framework-independent principles for future EQCOFE frontend work. It prepares a reviewable baseline for storefront implementation from Step 58 onward without selecting a framework, changing runtime behavior, or activating automated enforcement.

No statement in this document overrides the canonical roadmap, current-state documents, product-design contracts, OpenAPI contracts, security boundaries, or verified backend behavior.

## 2. Canonical alignment

- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Reviewed baseline: `e5e1c34744e94cc7e8740fe7f3927a071a021ef5`
- Roadmap version: `3.46 — Step-56-F Customers, Wholesale, Marketing and Content`
- Current execution position: Step 56-F is complete; there is no active substep.
- Next approved substep: Step 56-G — Finance, Analytics, Configuration & Security — `NOT_STARTED`.
- Step 57 remains the planned high-fidelity UI and prototype approval stage.
- Storefront implementation begins at Step 58.
- Admin frontend implementation begins at Step 67.
- The current package identifies itself as `eqcofe-backend`; no production frontend framework is selected by this draft.

This document does not change any roadmap status, approve Step 56-G, start Step 57 or Step 58, or certify frontend runtime readiness.

## 3. Requirement levels

- **MUST** — a framework-independent, low-risk principle expected to remain valid when frontend implementation begins.
- **SHOULD** — a recommended default that may be changed when documented constraints justify an alternative.
- **DECISION REQUIRED** — a deferred choice that must not be implemented until the responsible roadmap gate records an architecture or product decision.

An undecided framework, tool, topology, provider, or deployment model must never be treated as a MUST.

## 4. Design tokens

### MUST

- Repeated visual design values must originate from the canonical EQCOFE design-system contract.
- Generated artifacts must not be edited by hand.
- A token change must begin in the canonical contract and pass through the existing generator and drift checks.
- Future frontend code must consume semantic tokens where an applicable token exists.

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
- Framework-specific handling of inline styles and utility classes.

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

- Framework-specific RTL utilities and any Tailwind mapping. Tailwind is not selected or installed by this draft.

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
- Include automated checks and manual assistive-technology review in the future testing strategy.

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

- Framework-specific public-variable prefixes. Names such as `VITE_` and `NEXT_PUBLIC_` are examples only and are not selected by this draft.
- Frontend configuration loading and validation strategy.

## 9. Authentication, cookies and sessions

### MUST

- Authentication and authorization decisions remain server-authoritative.
- Cookie, session, CORS or CSRF behavior must not change without a dedicated architecture and security review.
- Protected mutations must preserve the canonical authentication, authorization, Step-Up, audit and idempotency boundaries.
- Browser-visible errors must not disclose sensitive authentication or internal diagnostic data.

### Required audit before implementation

The future authentication design must evaluate:

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

- Cookie name and prefix;
- host-only versus domain-scoped cookies;
- `SameSite` mode;
- subdomain topology;
- SSO and session-sharing requirements.

This draft does not prescribe or modify `__Host-`, `Domain`, `SameSite`, CORS, CSRF, SSO or session configuration.

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

### MUST

- Tests must verify observable behavior and critical contracts, not only implementation details.
- Security-sensitive and transactional flows must include failure, denial and recovery paths where applicable.
- A test or policy must not be removed, skipped or weakened merely to obtain a passing build.

### Future test layers

- unit;
- component interaction;
- integration;
- API contract;
- end-to-end;
- accessibility;
- visual regression;
- performance.

### DECISION REQUIRED

- Frontend test runner and component-testing library;
- E2E framework;
- visual-regression service or repository-native approach;
- browser and device matrix;
- test ownership and CI execution policy.

Vitest, React Testing Library, Playwright and Cypress are examples only. None is selected or installed by this draft.

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

Future measurement should cover LCP, INP, CLS, route loading and bundle size.

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

## 17. Future enforcement plan

The following sequence is advisory and inactive:

1. complete the applicable design and approval gates;
2. select and record the frontend stack;
3. create the frontend foundation under its roadmap step;
4. integrate the canonical design-token generation boundary;
5. establish a measured baseline;
6. run candidate lint and policy checks in reporting mode;
7. measure false positives and execution cost;
8. add component and critical-journey tests;
9. define accessibility coverage;
10. define performance budgets;
11. activate each proven gate in a separate reviewed PR.

Nothing in this sequence is executed or authorized by this document.

## 18. Activation gate

This draft may become an enforcing constitution only through a separate reviewed change after all applicable conditions are verified:

- Step 57 is closed, or the canonical roadmap explicitly permits earlier activation;
- Step 58 is approved to start;
- the frontend framework and rendering strategy are selected;
- the application and deployment architecture is recorded;
- authentication, cookie and CSRF architecture is reviewed;
- the token integration path is approved;
- testing tools are selected;
- CI execution time and cost are assessed;
- each proposed policy has run in reporting mode;
- false positives and exception handling are reviewed;
- an independent PR receives explicit approval;
- the owner explicitly authorizes activation.

Until then, the status remains:

```text
Status: DRAFT / NON-ENFORCING
Enforcement: NONE
```

## 19. Non-authorization summary

This draft does not authorize:

- frontend implementation;
- framework or tool selection;
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
