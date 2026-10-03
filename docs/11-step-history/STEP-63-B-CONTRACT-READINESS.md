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


## Live contract-readiness findings — audit pass 1

The following findings are confirmed from canonical runtime/controller code and `contracts/http/openapi.yaml` at baseline `53870e90ea08e0e7045c6c4149282e5d60ef2909`.

### Cart and quote

- Cart create/view/add/update/remove response status and `CartView` shape are materially aligned.
- Customer cart view/access/merge are typed and materially aligned with runtime.
- Public shipping-method output is typed and matches the runtime projection `id/code/name_fa/fee_toman`.
- **Confirmed contract gap:** runtime `CartService.quote()` accepts optional `coupon_code` and sends it to checkout-promotion evaluation, while the OpenAPI request body currently exposes only `shipping_method_id`.
- **Confirmed typing gap:** runtime quote output also carries `customer_type`, `pricing_discount_toman`, `marketing_discount_toman` and `marketing_snapshot`, while `CheckoutQuoteResponse` does not explicitly type these fields.
- **Confirmed typing gap:** quote `items` are currently declared as generic objects with `additionalProperties: true` although runtime emits a stable checkout-line snapshot including product/variant identity, quantity, unit base/final price, discount, tax and line total.

### Checkout reserve and order

- `POST /checkout/{id}/reserve` is idempotency-protected in runtime and OpenAPI, uses the checkout token boundary, revalidates cart version/sellability/shipping, and returns the documented reservation shape.
- `POST /checkout/{id}/order` is idempotency-protected and its request `address` snapshot matches the runtime controller handoff to `OrderService.create()`.
- No Stage-B evidence currently requires a database migration or a new dependency for reserve/order.

### Customer address

- Runtime create/update/set-default/delete operations are customer-owned and idempotency-protected.
- **Confirmed contract gap:** `GET /customer/addresses` and mutation success responses are not typed with canonical address response schemas.
- **Confirmed status drift:** OpenAPI advertised stale `202` responses; runtime uses Nest default `201` for address creation and explicit `200` for set-default.
- **Confirmed idempotency drift:** `POST /customer/addresses/{id}/set-default` uses `@RequireIdempotency('customer.address.set_default')` in runtime, but its OpenAPI operation does not currently declare the required idempotency metadata consistently.

### Payment and outcome

- Guest payment initiation is guarded by order/checkout ownership and required idempotency; OpenAPI exposes the checkout-access boundary and required idempotency.
- Payment verify/status endpoints are present and runtime treats provider callback/return as non-authoritative; provider verification/status remains authoritative.
- Runtime correctly fails closed on unknown/ambiguous payment outcomes and uses reconciliation rather than manufacturing success.
- Legacy Step-55 customer-prefixed payment labels must not be copied into Step 63 Storefront where current OpenAPI exposes the canonical guest checkout paths.

## Audit disposition

A scoped OpenAPI/generated-contract/test repair is justified for the confirmed gaps above. No backend business-rule rewrite is justified by audit pass 1.

Runtime/OpenAPI/generated/test mutation remains blocked until the Task Contract pre-mutation gate is satisfied:

```text
GRAPH_HEALTH = FRESH / PASS
QUERY_EVIDENCE = PRESENT
PATH_EVIDENCE = PRESENT when applicable
EXPLAIN_EVIDENCE = PRESENT for non-trivial dependency decisions
HUMAN_GATE = APPROVED for the final HIGH-risk artifact
```


## Implemented scoped repair

The Stage-B repair remains contract/test-only; backend business logic was not changed.

- Checkout quote request now exposes runtime-supported optional `coupon_code`.
- Checkout quote response now types `customer_type`, pricing/marketing discount split, marketing snapshot and stable line-item snapshots.
- Customer address list/create/update/set-default success responses are typed with a canonical customer-address response schema.
- Address create now documents runtime `201`; set-default documents runtime `200`; stale `202` claims were removed.
- Address request fields now match runtime authority: `is_default` is create-only and `location_metadata` is modeled; patch cannot mutate default status.
- Idempotency metadata is explicit on customer address mutations.
- Reserve/order/payment authority and fail-closed recovery behavior were audited and intentionally left unchanged.
- Regression coverage: `test/step63-cart-checkout-contract.spec.ts`.
- Database migration: NONE.
- Dependency change: NONE.
- Backend runtime business-rule mutation: NONE.

## Local Graphify evidence

Pre-mutation Graphify evidence was completed on exact head `140473a9c44ae2184248c8cb269730d2c82575ef`:

- refresh + record-state;
- query: `cart checkout quote address payment openapi`;
- path: `CartService -> PaymentService`;
- explain: `CartService`;
- terminal sentinel: `STEP63_GRAPH_EVIDENCE_COMPLETE`;
- GitHub evidence comment: `5967651506`.

## Recovered design provenance repair

Changing canonical OpenAPI invalidates historical source hashes consumed by Step56/57 validators. The repair follows the previously canonical Step 60/61/62 pattern: only recovered-source SHA references and derived manifest SHA references are synchronized. Diff review confirms these Product Design files contain hash-only changes; frames, journeys, UI semantics, historical verdicts and application behavior remain unchanged.

## Remaining canonical gates

After exact-head CI is green, Stage 63-B still requires deterministic Review PASS, Security PASS, exact-artifact ACTIVE Lock, explicit Project Owner HUMAN approval, protected merge, exact-SHA postmerge verification and terminal Lock RELEASE.
