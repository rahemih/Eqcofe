# EQCOFE — Step 46 / A7

## Pricing / Cart / Checkout Integration

**Status:** COMPLETE / FINAL GATE PASS

## Implemented
- Marketing exposes a single `CheckoutPromotionService` that composes automatic and coupon-backed promotions deterministically.
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

The initial Canonical CI run passed OpenAPI, architecture, policy and TypeScript build, but exposed two legacy `customer-commerce-pricing` harness failures because `CartService` gained A7 dependencies. The harness was updated to inject explicit no-promotion/no-history test doubles while preserving the original customer/pricing assertions; no production behavior was weakened.

## Canonical verification evidence
Verification-only Draft PR #11 tested the exact A7 main source; its branch contained documentation-only CI trigger markers and is not merged.

Final GitHub Actions Canonical CI run `32260541195`, job `verify` (`96092481216`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 362 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A7 tests: 9/9 PASS
- runtime tests: **173 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A7 FINAL GATE = PASS**
**A7 = COMPLETE**
