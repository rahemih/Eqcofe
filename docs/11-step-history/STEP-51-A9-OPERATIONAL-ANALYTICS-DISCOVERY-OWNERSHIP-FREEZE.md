# Step 51 / A9 — Operational Analytics Discovery / Ownership Freeze

**Status:** COMPLETE / FINAL GATE PASS

## Scope decision
A9 freezes the next launch-critical operational analytics slice to Fulfillment, Shipment, Returns and Warranty. Orders/Sales are excluded because A4 already owns their management composition. Procurement, POS, notification delivery, provider health, exports and HTTP/RBAC exposure remain outside this slice.

A9 is evidence and design only. It adds no migration, runtime code, dependency, event contract, API operation, permission, export or business-rule change.

## Authoritative ownership
- Fulfillment owns order fulfillment progress and lifecycle facts in `fulfillment.fulfillments`.
- Fulfillment owns shipment lifecycle and tracking facts in `fulfillment.shipments` and `fulfillment.tracking_events`.
- Returns owns return headers, item disposition and append-only status history in `returns.returns`, `returns.return_items` and `returns.status_history`.
- Warranty owns claim lifecycle, resolution and append-only status history in `warranty.claims` and `warranty.status_history`.
- Analytics may own derived operational projections and bounded read composition only. It must never mutate or overrule those source domains.

## Frozen projection granularity for A10
A10 may add exactly four Analytics-owned projections:

1. `analytics.fulfillment_operational_metrics`, one row per `order_id`.
2. `analytics.shipment_operational_metrics`, one row per `shipment_id`.
3. `analytics.return_operational_metrics`, one row per `return_id`.
4. `analytics.warranty_operational_metrics`, one row per `claim_id`.

Each projection must retain its source identity, current source status, authoritative lifecycle timestamps, source version/update watermark and Analytics projection timestamp. Shipment may retain order/warehouse/carrier snapshot identifiers required for grouping, but no customer PII or mutable provider payload. Return and Warranty may retain order/customer lineage identifiers for bounded grouping, but no issue description, notes, reasons or other free text.

Projection writes must be stale-watermark guarded and must re-read the authoritative source row in the same consumer transaction. Event payloads are triggers, not source truth. No cross-domain foreign key may create mutation coupling from Analytics back to an owner schema.

## Canonical lifecycle evidence
- Fulfillment statuses: `unfulfilled`, `partially_allocated`, `allocated`, `preparing`, `partially_shipped`, `shipped`, `partially_delivered`, `delivered`, `cancelled`.
- Shipment statuses: `draft`, `ready`, `handed_over`, `in_transit`, `delivered`, `delivery_failed`, `cancelled`, `returned`.
- Return statuses: `requested`, `under_review`, `approved`, `rejected`, `in_transit_to_store`, `received`, `inspecting`, `resolved`, `cancelled`.
- Warranty statuses: `requested`, `under_review`, `approved`, `rejected`, `received`, `repairing`, `resolved`, `closed`, `cancelled`.

The source schemas already persist the timestamps required for queue age and completed-cycle calculation. Returns and Warranty also retain append-only status history. No operational SLA or "stuck" threshold is currently an approved business rule.

## Event-trigger audit
Existing canonical triggers cover:

- Fulfillment: `fulfillment.allocated.v1`, `fulfillment.preparation_started.v1`, `fulfillment.picked.v1`, `fulfillment.unpicked.v1`.
- Shipment command lifecycle: `shipment.created.v1`, `shipment.ready.v1`, `shipment.handed_over.v1`, `shipment.cancelled.v1`.
- Returns: `return.requested.v1`, `return.review_started.v1`, `return.approved.v1`, `return.rejected.v1`, `return.received.v1`, `return.inspection_started.v1`, `return.resolved.v1`, `return.cancelled.v1`.
- Warranty: `warranty.claim_requested.v1`, `warranty.review_started.v1`, `warranty.approved.v1`, `warranty.rejected.v1`, `warranty.received.v1`, `warranty.repair_started.v1`, `warranty.resolved.v1`, `warranty.closed.v1`.

### Verified event gap
Carrier tracking updates change Shipment source status to `in_transit`, `delivered`, `delivery_failed` or `returned`, but the current tracking path does not append a domain event to the Outbox. Therefore A10 must not claim complete event-driven Shipment projection from the current event set.

Before Shipment projection is accepted, A10 must add a versioned, non-authoritative tracking-status trigger contract and append it atomically with the accepted source transition, or demonstrate an equivalent durable source-change trigger that preserves replay, idempotency and stale-watermark guarantees. Polling or trusting provider payloads directly is not accepted.

The schema permits Warranty `cancelled`, but the current Warranty application service exposes no cancellation transition/event. A10 must not invent that transition. It may project an authoritative cancelled row if encountered during source reconciliation, while cancellation behavior remains a Warranty-domain decision outside Analytics.

## Frozen bounded query semantics
A10 management composition is limited to:

- counts grouped by canonical status;
- queue rows ordered deterministically by source update time and identity;
- caller-bounded time windows and list limits of 1–500;
- current age in integer seconds relative to an explicit validated `as_of` instant;
- completed counts and average completed lifecycle duration in integer seconds;
- latest projection/source watermark needed to disclose read-model freshness.

No hard-coded SLA, late/stuck classification, forecast, customer scoring, monetary calculation or mutation command is approved. If the product later approves SLA thresholds, they require an explicit configuration/business-rule decision and a separate slice.

## Security and correctness invariants
- Analytics remains read-side and non-authoritative.
- Free text and carrier payloads are excluded from management projections.
- Source timestamps must be validated for lifecycle ordering; invalid or unsafe evidence fails closed.
- Numeric counts/durations must remain safe integers.
- Reads remain bounded and deterministically ordered.
- No HTTP, OpenAPI, RBAC, export or dashboard contract is introduced by A9 or implicitly approved for A10.
- No existing migration, event contract or branch history is rewritten.

## A10 acceptance gate
A10 is approved as **Operational Analytics Projection + Bounded Read Model** only within this freeze. It must include forward-only migration(s), authoritative re-read ingestion, the Shipment tracking trigger gap closure, stale/replay tests, lifecycle validation tests, bounded read tests and the full canonical verification suite.

Any expansion beyond these four projections or any SLA/business-rule classification requires a new decision before implementation.

## Verification
- Repository and canonical branch were re-verified before discovery.
- Discovery baseline: canonical `main` at `f1da042582dc1443a94be3a2cfa1866c0b0d18d8`.
- A8 implementation and final evidence are present on canonical `main`.
- Linear issue `HOS-9` remains `In Progress` and aligned through A8.
- Open pull requests at discovery start: `0`.
- Documentation diff check: PASS.

## Next
Proceed to Step 51 / A10 — Operational Analytics Projection + Bounded Read Model, strictly within the frozen ownership, event and query boundary above.
