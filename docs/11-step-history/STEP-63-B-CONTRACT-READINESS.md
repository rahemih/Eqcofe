# EQCOFE — Step 63-B Backend/OpenAPI Contract Readiness

## Status

`STEP_63_A = CANONICAL_COMPLETE`

`STEP_63_B = IN_PROGRESS / AUDIT_FIRST`

Canonical baseline: `53870e90ea08e0e7045c6c4149282e5d60ef2909`

## Purpose

Stage 63-B validates whether the existing backend and canonical HTTP contract are sufficient for the frozen Cart & Checkout Storefront journey before any frontend production implementation begins.

This stage is HIGH risk. Audit and evidence collection may proceed immediately; backend/OpenAPI/runtime mutation may not proceed until fresh local Graphify evidence and the required Human Gate exist.

## Frozen readiness matrix

The audit must cover:

- cart creation, retrieval, add/update/remove item;
- authoritative cart quote;
- customer cart access and guest-to-customer merge;
- customer-owned address operations needed by checkout;
- shipping/pickup method discovery;
- checkout reserve and order submission;
- payment initiation;
- payment verify and status recovery;
- guest order/outcome lookup boundaries;
- token ownership, idempotency and fail-closed recovery semantics.

## Authority rules

1. Current `contracts/http/openapi.yaml` and generated contract code are authoritative over historical Step-55 endpoint labels.
2. Price, stock, discount, shipping, totals, ownership, order and payment state remain server-authoritative.
3. Provider return/callback data alone is not payment truth.
4. Required retries must preserve idempotency semantics.
5. Sensitive cart/checkout/payment tokens must not become browser-visible authority or leak through URLs/logs.

## Pre-mutation gate

Before touching backend/OpenAPI/runtime code:

```text
GRAPH_HEALTH = FRESH / PASS
QUERY_EVIDENCE = PRESENT
PATH_EVIDENCE = PRESENT when mutation crosses module boundaries
EXPLAIN_EVIDENCE = PRESENT for non-trivial dependency decisions
HUMAN_GATE = APPROVED
```

Until those conditions are present, Stage 63-B remains read-only except for its governed documentation/task metadata.

## Current evidence inherited from 63-A

Canonical OpenAPI already advertises the required high-level backbone for cart, quote, checkout reserve/order, address, shipping and payment flows. Stage 63-B now verifies implementation parity, error semantics, ownership boundaries, idempotency and test coverage rather than assuming route presence is sufficient.

## Exit criteria

Stage 63-B reaches CANONICAL_COMPLETE only after the readiness matrix is fully evidenced, all necessary scoped repairs (if any) are verified, required HIGH-risk Human Gate evidence is bound to the exact artifact, Merge Policy succeeds, protected merge completes, exact-SHA postmerge verification passes and the terminal Lock is released.
