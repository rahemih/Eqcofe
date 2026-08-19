# EQCOFE — Step 46 / A7

## Pricing / Cart / Checkout Integration

**Status:** IMPLEMENTED / CI VERIFICATION PENDING

## Implemented
- Marketing now exposes a single `CheckoutPromotionService` that composes automatic and coupon-backed promotions deterministically.
- Pricing remains authoritative for line/base price; Marketing is evaluated only against the post-Pricing merchandise amount (`pricing_net_toman`).
- Cart derives customer type through the Customer commerce port and completed-purchase history through an Orders-owned public port. Client input cannot supply either authoritative fact.
- Optional `coupon_code` is accepted by checkout quote and validated server-side by the A5 coupon engine.
- Exclusive-vs-stackable composition is deterministic and total Marketing discount is capped at the post-Pricing merchandise amount.
- Checkout persists a separate `marketing_discount_toman` and `marketing_snapshot`, while `discount_toman` remains the total discount for backward-compatible financial consumers.
- Order rows copy the exact marketing snapshot from their Checkout at insert time; Orders does not recalculate Marketing.

## Persistence hardening
Additive migration `0038_marketing_checkout_snapshot.sql`:
- adds `marketing_discount_toman` + `marketing_snapshot` to Checkout and Orders;
- preserves total-discount compatibility while separating Pricing and Marketing audit facts;
- updates deferred total-integrity functions so `discount_toman = line pricing discount + marketing_discount_toman`;
- constrains total discount to merchandise subtotal;
- copies Marketing snapshot from Checkout to Order via database trigger.

## A7/A8 boundary
A7 integrates deterministic Marketing evaluation and durable commercial snapshots. It does **not** claim atomic promotion/coupon redemption reservation. Atomic redemption, retry/concurrency lifecycle, release/consume behavior and final financial integrity remain Step 46 / A8.

## Verification coverage
`test/marketing-step46-a7.spec.ts` covers deterministic coupon/automatic composition, stacking cap, server-owned wholesale/purchase facts, post-Pricing Marketing calculation, authoritative paid-order history, persistence invariants, durable snapshot persistence and module wiring.

## Closure gate
A7 becomes COMPLETE only after Canonical CI passes against the exact A7 source.
