# EQCOFE — Step 63-H Integrated Cart/Checkout Acceptance

Status: IMPLEMENTATION_IN_PROGRESS

Canonical baseline: `e4da7d24e47d3c6791a237167a4ea94360bd07e5`

Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP63-H-ACCEPTANCE-001.json`

## Objective

Accept the canonical Step 63 Cart/Checkout runtime as one production Storefront experience without changing product business logic. Stage 63-H adds a deterministic integrated acceptance harness and package wiring only.

## Acceptance surface

- Cart ready state and production Checkout entry.
- Guest identity boundary without browser-owned auth authority.
- Authoritative customer address and shipping-method rendering.
- HMAC-signed Checkout Review snapshot tied to the server-only Checkout token.
- Idempotent reservation and order creation.
- HMAC-signed payment handoff.
- Provider callback bridge with callback state kept server-to-server and removed before Payment Return.
- Authoritative payment status and verify.
- Authoritative Order Outcome.
- Persian RTL, bidi-safe references, responsive reflow, 44px targets, keyboard focus and automated axe/WCAG checks.
- Browser acceptance at 320px and 1200px when the isolated QA toolchain is available.

## Scope boundary

No Storefront runtime component, backend, OpenAPI, database, dependency, workflow, Product Design source or current-state/roadmap document is changed by Stage 63-H. Production payment-provider activation and secrets remain deferred to Step 74.

Graph/Graphify remains deferred by Project Owner directive to **Stage 63-I final canonical verification/closure**, before Step 64 handoff.

## Governance

Risk: MEDIUM. Human Gate is not required. Canonical completion requires exact-head Canonical CI, Phase A and Storefront Quality, deterministic Review, exact-artifact ACTIVE Lock, protected Merge Policy transport, exact-SHA postmerge verification and terminal Lock release. Stage 63-I remains blocked until Stage 63-H is terminal.
