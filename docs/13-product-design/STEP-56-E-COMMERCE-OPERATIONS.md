# Step 56-E — Orders, Payments and After-Sales

Design gate complete; canonical completion requires exact-head CI, expected-head merge and post-merge CI. F–H remain NOT_STARTED. This gate designs repository-native low-fidelity surfaces only and makes no runtime, API, permission, migration, dependency or business-rule changes.

## Canonical handoff and scope

Starting main `040a4a784a613f63a5455100b92efc3bb6b32df9`; D PR157/head `53c51d49c0ed6a3a439eb73c6402606c819a5033`, CI34189546515 and post-merge34189661313 PASS. Main was fetched and the D post-merge CI independently reread. Branch `docs/step56-e-commerce-operations`.

The A foundation remains the frozen97-surface/532-operation inventory. A/B/C/D contracts and Step53/54/55 inheritance remain immutable snapshots. E traces11 surfaces and74 operations with95 hashed sources, including assembled OpenAPI, supplemental POS contract, auth conventions and all source files in orders, payments, fulfillment, cart, returns, warranty, POS and after-sales. The contract records exact actors, journeys, domains, permission claims, operation evidence and all required states. Generated traceability supplies every operation-to-view and state-to-view mapping.

26 E operations remain NO_ACTION: all7 admin orders,7 store/register/shift,6 sale/scan and6 offline/reconciliation operations. This includes GET: no live list, count, loading, mutation confirmation or success is offered on those four surfaces. Contract-only operations lack runtime authority; controller-only POS operations remain outside assembled OpenAPI. Supplemental permissions do not resolve that gap. No guest/customer checkout-token workaround is allowed. A's four global gap sets remain unchanged:156 contract-only,151 missing-permission,25 controller-only,5 permission conflicts (overlapping). These are accepted design limitations, not executable release approval.

## Operation-specific acceptance

| Surface | Operations | Required distinction |
|---|---:|---|
| AD-E-01 orders |7| Entire surface unavailable; no invented admin backend |
| AD-E-02 payments |4| Provider reconciliation only; late payment is not fulfillment |
| AD-E-03 refunds |9| Creator differs from approver; failed retry vs unknown reconcile |
| AD-E-04 fulfillment |6| Allocation, preparation and incremental pick are separate |
| AD-E-05 shipments |7| Ready vs carrier handover vs delivery; cancel draft/ready only |
| AD-E-06 shipping methods |3| Integer Toman; immutable code; PATCH current If-Match |
| AD-E-07 returns |9| Receipt, inspection, exact item resolution and requested outcomes |
| AD-E-08 warranty |10| Repair/resolution/closure separate; refund request is not payment |
| AD-E-09 store/register/shift |7| Entire surface unavailable |
| AD-E-10 scan/sale |6| Entire surface unavailable |
| AD-E-11 offline/reconciliation |6| Entire surface unavailable; no automatic sync |

Refund creation has payment_id, positive safe integer amount_toman and required reason_code up to200 characters. Source payment must be paid/late_received/refund_required. Cap checked at create/process; approval requested only and not creator. Reject requested only; cancel requested/approved/failed only. Process approved only, retry failed only, reconcile processing/unknown only. Unknown/processing must not be cancelled or retried as failed. Reject/cancel endpoints do not accept a reason body, so none is invented. Provider capability or missing reference can require manual review; no blanket partial-refund support. Two-minute provider leases and unconfirmed outcomes must not be shown as success. Payment list default50, refund100, maximum200; local filters and collection caps are not pagination or complete totals.

Fulfillment requires confirmed settled order and reservation. Allocation strategy single_warehouse_preferred/manual; unique item/warehouse rows with positive quantities. Preparation requires all lines fully allocated. Pick is an increment, not replacement total; unpick requires reason and cannot go below shipped amount. Shipment creation uses picked availability, warehouse, method and unique items. Handover consumes stock but does not prove customer delivery. Cancel draft/ready only with reason2..2000. Tracking needs provider and tracking number; no manual delivery or tracking edit endpoint. Warehouse context is visible but uniform ScopePolicy enforcement is not certified.

Shipping method create code2..50 lowercase letters/digits/underscore/hyphen, Persian name minimum2, nonnegative integer fee and active defaulttrue. PATCH uses current If-Match and updates name/fee/active only. No delete or extra Step-Up/idempotency requirement invented.

Return receive approved/in_transit_to_store; unique nonnegative input quantities but every item must be positive after receive, so no promised persistent partial receipt. Resolve inspecting only, exact unique coverage of all items. Required resolution_note up to4000. Customer resolution refund/replacement/repair/no_action differs from stock disposition restock_sellable/restock_quarantine/damaged/repair/replace/refund/no_action. First three require warehouse. Refund requires positive safe integer amount capped by received/delivered line value; non-refund amount forbidden. Warranty resolve received/repairing; refund/replacement needs positive quantity within delivered quantity, capped refund money only for refund. Close resolved only with required note. Refund/replacement references remain requests; no cross-domain settlement/shipment completion claim.

## Security, states and layout

Exact Step-Up and idempotency scopes come from A controller evidence; current If-Match is traced per operation. Every supported mutation has safe cancel first and an authoritative-result companion. For an unknown outcome, use authorized read/status review and explicit same-key/same-payload replay only where the existing command is idempotent; never automatic/new-key retry. Available payment/refund/return/warranty reads have separate permission boundaries. Blocked POS expected_version remains a body field, never mislabeled If-Match. Audit references are shown only when returned; source event recording does not invent an audit-reading endpoint. Hide sensitive tokens, raw provider payloads and unrelated customer data.

All inherited states are conditional dispositions, not invented lifecycle transitions. Loading preserves focus, labels retained data stale and prevents double submit; empty differs from denied. Error summary receives focus and links inline errors. Secure Step-Up returns to review, keyboard focus stays within modal, Escape restores trigger, no fixed action obscures focus, touch targets at least44px (frames use48px). Persian-first RTL and LTR-isolated identifiers inherit Step54/B. Six primary widths320/360/600/840/1200/1440; other variants320/1440. Sidebar changes at840 and compact tables use labelled cards. Integer Toman/no Wallet/no brown; no invented assets or paid services. Figma remains optional.

UI/UX Pro Max's targeted confirmation-dialog guidance supports review before irreversible actions. Ten screenshot samples cover all six widths, blocked orders/POS, long return form and refund/warranty confirmation. Static320 equivalent is the400% layout evidence; actual browser zoom, runtime keyboard and screen-reader certification remain implementation obligations. Not every frame was screenshot-reviewed.

## Artifacts and final gate

Contract `step56-commerce-operations-wireframes.json`; specification/history `STEP-56-E-COMMERCE-OPERATIONS.md`; gallery/manifest and per-surface README/traceability under `step56-wireframes/E/`. Filenames `AD-E-XX--width--view--v1.svg`. Semantic validator checks frozen authority, sources/hashes, state/operation/view coverage, visible lifecycle guards, blocked states and limits. Deterministic generator checks content/hashes/missing/extra artifacts. Negative tests reject unsafe retry, privilege expansion, false completion and F start. Full pnpm verify and git diff --check required. Immutable transport evidence is recorded in PR/execution report after CI/merge to avoid self-referential hashes.

Frozen counts: surfaces=11, operations=74, states=531, views=162, sources=95, actors=3, journeys=5, domains=7, permissions=29, frames=368, artifacts=393.
