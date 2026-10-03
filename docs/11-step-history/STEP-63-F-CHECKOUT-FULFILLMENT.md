# EQCOFE — Step 63-F Address, Delivery, Quote, Reservation, Review & Order Submission

## State

**IN_PROGRESS / NOT_CANONICAL**

Canonical predecessor: Step 63-E merge `da8d0fb465e85ef37a30e00c71a008cea4a31b25`.

## Implemented scope

- `/checkout/address`: authenticated customer-owned existing Address list, selection and safe edit.
- `/checkout/delivery`: authoritative `GET /shipping-methods`, optional coupon and backend Quote.
- `/checkout/review`: HttpOnly HMAC-bound Review snapshot tied to server-only Checkout credentials, authoritative integer-Toman totals, Reservation and idempotent Order submission.
- Successful Order creation hands off to `/order/:orderNumber/outcome`; Payment initiation/status/verify and outcome runtime remain Stage 63-G.

## Authority and safety

- Customer session, Cart token and Checkout token remain server-only.
- Existing Address ownership is re-read from `GET /customer/addresses` before use.
- Existing `province_id` and `city_id` remain opaque and unchanged during safe edits.
- Shipping methods/fees and Quote totals come only from backend responses.
- Review state is stored only in an HttpOnly, SameSite=Lax, 15-minute HMAC-bound cookie signed with the server-only Checkout token.
- Reserve and Order use stable server-generated idempotency keys.
- Unknown, expired or conflicting outcomes fail closed.
- Stage 63-F never infers Payment success.

## Blocking finding — new Address creation

The frozen Step-63 scope requires first-use Address creation. Canonical Address input requires opaque `province_id` and `city_id` UUIDs, while repository/OpenAPI discovery found no public province/city/geography lookup endpoint or canonical reference source.

Therefore Stage 63-F explicitly prohibits synthetic UUIDs and raw UUID input fields:

```text
ADDRESS_REFERENCE_DATA_MISSING = TRUE
NEW_ADDRESS_CREATION = FAIL_CLOSED
SYNTHETIC_GEOGRAPHY_UUID = PROHIBITED
STAGE_63_F = IN_PROGRESS / NOT_CANONICAL
```

Existing customer-owned Addresses remain usable. Stage 63-F must not be marked READY FOR PROTECTED MERGE until a governed canonical geography/reference-data contract resolves this blocker.

## Graph directive

Project Owner directive remains active: all Step-63 Graphify/graph work is deferred to final Step-63 acceptance/closure before Step 64 handoff.

## Exit gate

After the Address reference blocker is resolved, HIGH-risk final completion still requires exact-head Canonical CI, Phase A, Storefront Quality, CodeQL Security, deterministic Review, exact-artifact Project Owner Human approval, ACTIVE Lock, protected workflow_dispatch, exact-SHA postmerge verification and terminal Lock release.
