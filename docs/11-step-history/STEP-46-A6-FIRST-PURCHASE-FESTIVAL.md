# EQCOFE — Step 46 / A6

## First-Purchase + Festival Promotions

**Status:** COMPLETE / FINAL GATE PASS

## Implemented
- Automatic promotion resolver for active Campaign/Promotion windows.
- Automatic promotions are coupon-free by definition; coupon-backed promotions remain owned by the A5 Coupon engine.
- First-purchase promotions require a stable authenticated customer identity and authoritative `hasCompletedPurchase=false` fact.
- Returning customers are rejected from first-purchase promotions.
- Guest first-purchase discount is fail-closed because one-time identity cannot be proven safely.
- Wholesale eligibility remains explicit through `wholesale_allowed`.
- Total/per-customer usage facts count only active `reserved` + `consumed` redemptions.
- Exclusive promotions deterministically override stackable promotions; ties are resolved by promotion id.
- Stackable automatic discounts are accumulated deterministically and capped at subtotal so payable amount cannot become negative.
- `max_discount_toman` remains enforced in integer Toman.
- Marketing module exports `AutomaticPromotionService`.

## Persistence
No new schema shape was required in A6. Existing Campaign/Promotion/Redemption persistence from A3–A5 is reused. `AutomaticPromotionRepository` selects only active campaign/promotion windows and excludes promotions that have coupons.

## Ownership boundary
A6 consumes authoritative `isWholesale` and `hasCompletedPurchase` facts. It does not query Customer or Orders persistence directly. Checkout wiring and atomic redemption reservation remain A7/A8 work.

## Verification coverage
`test/marketing-step46-a6.spec.ts` covers stable identity for first purchase, eligible first-purchase discount, returning customer rejection, deterministic exclusive selection, stackable subtotal cap, wholesale policy, active/coupon-free repository filtering and module wiring.

## Canonical verification evidence
Verification-only Draft PR #10 tested the exact A6 main source. The first run exposed a strict TypeScript narrowing issue (`winner` possibly undefined); production code was corrected and the gate was rerun.

Final GitHub Actions Canonical CI run `32258059310`, job `verify` (`96084370271`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 358 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A6 tests: 8/8 PASS
- runtime tests: **164 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A6 FINAL GATE = PASS**
**A6 = COMPLETE**
