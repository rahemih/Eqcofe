# EQCOFE — Step 46 / A5

## Coupon + Eligibility Engine

**Status:** IMPLEMENTED / CI VERIFICATION PENDING

## Implemented
- Coupon lookup by normalized code.
- Campaign, promotion and coupon active-state/window validation.
- Promotion eligibility evaluation for minimum subtotal, first purchase, wholesale policy, total usage and per-customer usage.
- Coupon total/per-customer usage validation.
- Integer-Toman discount evaluation with maximum discount cap.
- Explicit stacking result propagation.
- Marketing module registration/export.

## Persistence hardening
Migration `0037_marketing_coupon_eligibility_hardening.sql`:
- aligns PostgreSQL coupon format with the A2 domain format;
- requires coupon windows to stay inside their promotion window;
- adds active redemption usage indexes for promotion/coupon counting.

## Ownership boundary
A5 consumes authoritative eligibility facts (`isWholesale`, `hasCompletedPurchase`) as inputs. It does not infer wholesale status from profiles and does not query Orders directly. Wiring those authoritative commerce facts into Checkout is deferred to the dedicated integration substep.

## Concurrency note
A5 evaluates usage from `reserved` + `consumed` redemptions and fails closed at the current snapshot. Atomic reservation and concurrent limit enforcement remain the responsibility of the Redemption/Checkout transaction path in the later integration/integrity substeps; A5 does not falsely claim race-free reservation.

## Verification coverage
`test/marketing-step46-a5.spec.ts` covers normalization, first-purchase eligibility, wholesale policy, per-customer limits, active campaign/promotion checks, active-usage counting, database hardening and module wiring.

## Closure gate
A5 becomes COMPLETE only after Canonical CI passes against the exact A5 source.
