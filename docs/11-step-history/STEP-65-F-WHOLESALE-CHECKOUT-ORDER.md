# Step 65-F — Wholesale Checkout & Order Integration Hardening

**Task:** `EQCOFE-STEP65-F-WHOLESALE-CHECKOUT-ORDER-001`  
**Risk:** HIGH  
**Canonical base:** `2d893ea144177c9346555da24b15dce636f0b24a`  
**Linear:** HOS-69

## Goal

Complete SJ-11 from an authoritative wholesale Cart through the existing Checkout/Reservation/Order/Payment path without creating a separate B2B commerce engine.

## Live discovery

- Step 65-E is `CANONICAL_COMPLETE` through PR #335 / main `2d893ea144177c9346555da24b15dce636f0b24a`.
- `CheckoutQuoteResponse.customer_type` already comes from Backend authority.
- The server-side Checkout Review snapshot already carries `customerType`.
- Checkout Review currently does not present that wholesale context.
- `OrderResponse` currently has no `customer_type`.
- `orders.orders` retains the originating `checkout_id`, but `cart.checkouts` currently does not persist the quoted customer type.
- Re-reading current Customer Profile after order creation would be incorrect historical authority.
- No 65-F branch/PR existed at start; only unrelated dependency PRs #289/#290 were open.

## Decision

Persist a single authoritative `cart.checkouts.customer_type` snapshot at Quote creation, keep it immutable through the existing Checkout lifecycle, and expose it from the resulting Order by joining the originating Checkout. Do not duplicate it into a second B2B order engine or re-run Pricing/Customer authority after the fact.

## Explicit non-goals

- no wholesale threshold or percentage formula in Storefront;
- no Pricing rule/config mutation;
- no Customer promotion/approval mutation;
- no Inventory/Reservation rule mutation;
- no Payment or Order state-machine mutation;
- no second Cart, Checkout, Order or Payment engine;
- no dependency change;
- no Product Design semantic mutation.

## Required UX hardening

- Checkout Review: show authoritative wholesale context from the signed Quote snapshot;
- Order Outcome: show wholesale context only from `OrderResponse.customer_type`;
- Account Order Detail: same immutable order context;
- continue displaying authoritative integer-Toman totals and existing recovery/idempotency semantics.

## Closure

HIGH-risk final closure requires exact-artifact Security/Review/Lock/Human evidence, protected merge, exact-SHA postmerge verification and terminal Lock release.
