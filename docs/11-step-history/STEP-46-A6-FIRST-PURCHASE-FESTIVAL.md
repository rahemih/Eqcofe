# EQCOFE — Step 46 / A6

## First-Purchase + Festival Promotions

**Status:** IMPLEMENTED / CI VERIFICATION PENDING

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
- Marketing module now exports `AutomaticPromotionService`.

## Persistence
No new schema shape is required in A6. Existing Campaign/Promotion/Redemption persistence from A3–A5 is reused. `AutomaticPromotionRepository` selects only active campaign/promotion windows and excludes promotions that have coupons.

## Ownership boundary
A6 consumes authoritative `isWholesale` and `hasCompletedPurchase` facts. It does not query Customer or Orders persistence directly. Checkout wiring and atomic redemption reservation are intentionally deferred to A7/A8.

## Verification coverage
`test/marketing-step46-a6.spec.ts` covers:
- stable identity requirement for first purchase;
- eligible first purchase discount;
- returning customer rejection;
- deterministic exclusive selection;
- stackable subtotal cap;
- wholesale denial unless allowed;
- active/coupon-free repository filtering;
- module wiring.

## Closure gate
A6 becomes COMPLETE only after Canonical CI passes against the exact A6 main source.
