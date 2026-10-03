# EQCOFE — Step 63-C Cart/Checkout Foundation

## Status

`STEP_63_B = CANONICAL_COMPLETE`

`STEP_63_C = IN_PROGRESS`

Canonical baseline: `f92d6dc3e96e9c0a4489d7085d50ca8ebde31ba2`

## Purpose

Build the shared Storefront Cart/Checkout foundation before any Step-63 route becomes production UI.

This stage owns only shared generated-contract aliases, server-only Cart/Checkout credential handling, server adapters, authoritative async/recovery state, deterministic verification, and the minimum refactor needed for Product Detail add-to-cart to reuse the shared Cart credential boundary.

## Security boundary

Cart and Checkout credentials are backend-issued bearer capabilities. They must remain:

- server-only;
- HttpOnly;
- SameSite=Lax;
- host-only;
- omitted from route data, browser state, URLs and logs;
- fail-closed on duplicate/invalid cookies.

Customer session remains a separate existing bridge. The foundation must never merge these credential classes into a browser-visible authority model.

## Backend authority

Backend remains authoritative for:

- cart ownership and contents;
- price, stock and discount;
- customer type;
- shipping availability and fee;
- checkout quote totals;
- reservation state;
- order creation;
- payment initiation, verification and status.

Unsafe POST/PATCH/DELETE operations are not implicitly retried. Unknown mutation outcomes must use authoritative status recovery where available instead of inventing success.

## Stage boundary

Stage 63-C does not productionize:
- /cart
- /checkout/identity
- /checkout/address
- /checkout/delivery
- /checkout/review
- /payment/return
- /order/:orderNumber/outcome

Those remain owned by later Step-63 stages.

## Exit criteria

Generated-contract parity, token boundary, shared adapters and state foundation must pass deterministic verification, canonical CI, Phase A and protected merge/postmerge transport. Only then may Step 63-D start.

## TTL evidence

Canonical backend configuration in `CartService` confirms:

- Cart TTL default: `commerce.cart_ttl_hours = 168` hours.
- Checkout TTL default: `commerce.checkout_ttl_minutes = 15` minutes.
- Reservation TTL default: `commerce.reservation_ttl_minutes = 15` minutes.

The Storefront credential cookies therefore use 7 days for Cart credentials and 15 minutes for Checkout credentials. These values mirror backend defaults rather than inventing a separate client authority.
