# EQCOFE — Step 63-D Production Cart Flow

## Status

`STEP_63_C = CANONICAL_COMPLETE`

`STEP_63_D = IN_PROGRESS`

Canonical baseline: `8a35247ebdce58decfc752b41e8fed89d7447da6`

## Purpose

Replace only the Step-63 `/cart` placeholder with a production Storefront Cart surface backed by the canonical Step 63-C server-only credential and data boundary.

## Frozen scope

- server-load the existing CartView contract;
- render empty, ready, error and recovery states in Persian RTL;
- update quantity and remove items only through backend-authoritative Cart mutations;
- keep Cart/Checkout bearer tokens HttpOnly and server-only;
- hand off to `/checkout/identity` only when the Cart is non-empty;
- do not fabricate price, stock, discount, shipping or payment truth that is not present in CartView.

## Explicitly deferred

Checkout identity, address, delivery, final quote/review, reservation, order creation, payment return and order outcome remain later Step-63 stages.

## Exit criteria

Stage 63-D becomes canonical only after deterministic verification, exact-head CI/Phase A/Storefront checks, deterministic Review, ACTIVE Lock, protected merge, exact-SHA postmerge verification and terminal Lock release.

## Repair cycle 1 — predecessor verifier compatibility

Canonical CI and Phase A initially failed because the Stage 63-C verifier hard-coded that every Step-63 route, including `/cart`, must remain a `RoutePlaceholder`. Stage 63-D is the authorized stage that productionizes `/cart`, so that assertion became stale. The repair keeps all Stage 63-C credential/data-boundary assertions, permits either the 63-C placeholder or the 63-D production Cart route for `cart.tsx`, and continues to require all later Step-63 checkout/payment routes to remain placeholders.
