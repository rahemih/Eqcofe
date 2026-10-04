# EQCOFE — Step 63-F Address, Delivery, Quote, Reservation, Review & Order Submission

## State

**IN_PROGRESS / CANONICAL GATES PENDING**

Canonical predecessor chain:
- Step 63-E merge: `da8d0fb465e85ef37a30e00c71a008cea4a31b25`.
- Address Reference Repair PR #310 merge: `e1c69999150d3b0c19ad27ce6cc8b5211b6b77d8`.

## Implemented scope

- `/checkout/address`: authenticated customer-owned Address list, selection, safe edit and new Address creation.
- New Address province/city selectors are emitted from the canonical Iran 1404 reference merged by PR #310: 31 provinces / 1481 cities.
- Browser code selects canonical reference IDs but never generates geography identifiers; backend validates the province-city pair again.
- `/checkout/delivery`: authoritative `GET /shipping-methods`, optional coupon and backend Quote.
- `/checkout/review`: HttpOnly HMAC-bound Review snapshot tied to server-only Checkout credentials, authoritative integer-Toman totals, Reservation and idempotent Order submission.
- Successful Order creation hands off to `/order/:orderNumber/outcome`; Payment initiation/status/verify and outcome runtime remain Stage 63-G.

## Authority and safety

- Customer session, Cart token and Checkout token remain server-only.
- Existing Address ownership is re-read from `GET /customer/addresses` before use.
- New Address geography originates from the source-locked 1404 repository reference and is validated both in Storefront server code and Customer Address backend service.
- Existing `province_id` and `city_id` remain unchanged during non-geography edits.
- Shipping methods/fees and Quote totals come only from backend responses.
- Review state is stored only in an HttpOnly, SameSite=Lax, 15-minute HMAC-bound cookie signed with the server-only Checkout token.
- Reserve and Order use stable server-generated idempotency keys.
- Unknown, expired or conflicting outcomes fail closed.
- Stage 63-F never infers Payment success.

## Address reference blocker resolution

`ADDRESS_REFERENCE_DATA_MISSING` is resolved canonically by PR #310.

Evidence:
- protected workflow_dispatch `37187061874` / Run #935 = SUCCESS;
- merge job `111391132912` = SUCCESS;
- merge SHA `e1c69999150d3b0c19ad27ce6cc8b5211b6b77d8`;
- exact-SHA postmerge `111391180657` = SUCCESS;
- terminal Lock release comment `5977917922`.

## Graph directive

Project Owner directive remains active: all Step-63 Graphify/graph work is deferred to final Step-63 acceptance/closure before Step 64 handoff.

## Exit gate

HIGH-risk final completion requires exact-head Canonical CI, Phase A, Storefront Quality, CodeQL Security, deterministic Review, exact-artifact Project Owner Human approval, ACTIVE Lock, protected workflow_dispatch, exact-SHA postmerge verification and terminal Lock release.
