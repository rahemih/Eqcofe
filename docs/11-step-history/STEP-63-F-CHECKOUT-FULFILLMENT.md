# EQCOFE — Step 63-F Address, Delivery, Quote, Reservation, Review & Order Submission

## Scope

Stage 63-F starts from canonical main `da8d0fb465e85ef37a30e00c71a008cea4a31b25` after Step 63-E terminal closure.

Implemented surfaces:

- `/checkout/address`: authenticated customer-owned address list, select, create, edit and set-default actions.
- `/checkout/delivery`: authoritative `GET /shipping-methods` selection and optional coupon input.
- `/checkout/review`: server-authoritative Quote creation, Checkout credential rotation, reservation, final totals, bounded rebuild and idempotent Order creation.
- Successful order creation hands off to the existing `/order/:orderNumber/outcome` route. Payment initiation/verification/outcome runtime remains exclusively Stage 63-G.

## Authority and safety

- Customer session, Cart token and Checkout token remain server-only HttpOnly cookies.
- Address ownership is re-read from `GET /customer/addresses` before selection, review and order creation.
- Shipping IDs are re-read from `GET /shipping-methods`; the UI never invents shipping fee values.
- Quote, reserve and order mutations use rendered idempotency keys.
- Refreshing Review never assumes the prior Quote/Reservation succeeded; authoritative state must be rebuilt.
- Unknown or conflicting backend outcomes fail closed.
- No Payment mutation exists in Stage 63-F.

## Geography compatibility finding

The canonical Customer Address contract requires opaque UUID `province_id` and `city_id` values, while the canonical repository exposes no public province/city dictionary endpoint and the database columns have no geography foreign-key constraint.

Stage 63-F therefore does **not** claim an authoritative geography catalog. For newly entered addresses:
- human-readable province/city labels are retained in `location_metadata`;
- the human-readable labels are also retained in `address_line`;
- deterministic opaque UUIDs are derived only as a compatibility representation for the existing backend contract;
- existing addresses retain their previously stored IDs unchanged.

This compatibility bridge must not be interpreted as production geography authority and must be replaced by an authoritative geography source before production shipping integrations depend on regional IDs.

## Graph directive

Project Owner directive remains active: all Step-63 Graphify/graph work is deferred to final Step-63 acceptance/closure before Step 64 handoff. Stage 63-F must not block on local graph state.

## Canonical exit gate

Stage 63-F is HIGH risk and is not canonical until exact-head Canonical CI, Phase A, Storefront Quality, CodeQL Security, deterministic Review, exact-artifact Project Owner Human approval, ACTIVE Lock, protected workflow_dispatch, exact-SHA postmerge verification and terminal Lock release are all evidenced.
