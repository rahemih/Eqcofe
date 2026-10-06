# EQCOFE — Step 64-H Integrated Account/After-Sales Acceptance

Status: IMPLEMENTATION_IN_PROGRESS

Canonical baseline: `5149a4588dc0a78cedb71dc9fce698e3d01e1016`

Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP64-H-ACCOUNT-ACCEPTANCE-001.json`

## Objective

Accept the canonical Step 64 Account & After-Sales runtime as one production Storefront experience without changing product business logic.

Stage 64-H adds only a deterministic integrated acceptance harness and package wiring. It verifies the runtime delivered by Stages 64-C through 64-G and does not mutate application, Backend, OpenAPI, database or Product Design.

## Acceptance surface

- Account overview and partial-failure handling.
- Profile/security surface.
- Customer-owned Address management surface.
- Orders list and owned order detail/timeline/invoice.
- Wishlist and customer notification tools.
- Returns list/detail/timeline/recovery.
- Warranty list/detail/timeline/recovery.
- Unauthenticated fail-closed states.
- Persian RTL and bidi-isolated identifiers.
- Responsive reflow at 320 CSS px and 1200 px.
- Representative 44px interactive targets and visible keyboard focus.
- Automated Axe/WCAG checks when isolated Chromium QA tooling is present.

## Scope boundary

No `apps/storefront/app/**`, Backend, OpenAPI/generated contract, database, dependency, workflow, Product Design source, current-state or roadmap file is changed by Stage 64-H.

Graph/Graphify remains retired and out of active governance.

## Governance

Risk: MEDIUM. Human Gate is not required.

Canonical completion requires exact-head Canonical CI, Phase A and Storefront Quality, deterministic Review, exact-artifact ACTIVE Lock, protected Merge Policy transport, exact-SHA postmerge verification and terminal Lock release.

Until then:

`STEP_64_H = IN_PROGRESS / NOT_CANONICAL`

`STEP_64_I = BLOCKED_FROM_MUTATION`
