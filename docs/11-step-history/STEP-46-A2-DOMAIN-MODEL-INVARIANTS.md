# EQCOFE — Step 46 / A2

## Marketing Domain Model + Invariants

**Status:** COMPLETE
**Final Gate:** PASS

## Implemented domain model

### Marketing
- `CampaignAggregate`
- `PromotionDefinition` / eligibility model
- `PromotionPolicy` validation and evaluation
- `CouponEntity`
- `RedemptionAggregate`

### Loyalty
- `LoyaltyPointsLedger`

## Frozen invariants

1. Monetary discount inputs/outputs are integer Toman.
2. Discount cannot exceed subtotal; payable amount cannot be driven below zero by the promotion evaluator.
3. Percentage discounts are integer 1..100.
4. Fixed discounts must be positive integer Toman.
5. Promotion active windows require start < end.
6. Promotion stacking defaults to `exclusive`; explicit stackability must be declared.
7. Wholesale customers are ineligible unless a promotion explicitly permits wholesale.
8. First-purchase eligibility consumes an authoritative `hasCompletedPurchase` commerce fact; Marketing does not infer first purchase from profile existence.
9. Usage limits are positive integers and are evaluated explicitly.
10. Per-customer limits require an identified customer.
11. Coupon codes are normalized server-side and validated.
12. Coupon disable/expiry/usage limits fail closed.
13. Redemption lifecycle is `reserved -> consumed`, `reserved -> released`, and `consumed -> reversed` for the same order.
14. Re-consuming the same reservation for the same order is idempotent; incompatible lifecycle transitions fail closed.
15. Loyalty uses integer points and cannot have a negative balance.
16. Loyalty points do not expose Toman conversion or cash-value semantics.
17. Duplicate loyalty ledger entry IDs are rejected.

## Test coverage

`test/marketing-loyalty-step46-a2.spec.ts` covers:
- campaign lifecycle safety;
- exclusive stacking default;
- discount floor at zero payable amount;
- first-purchase fact handling;
- wholesale default denial;
- coupon normalization and per-customer usage limits;
- redemption lifecycle/idempotency behavior;
- points balance and cash-conversion prohibition.

## Architecture and policy verification

The A2 domain sources use no NestJS/Kysely/PG/Redis/infrastructure imports and contain no `any`, matching the existing architecture gate rules.

An initial A2 error-code name contained the repository's forbidden cash-account token and was corrected to `LOYALTY_CASH_CONVERSION_FORBIDDEN` before closure.

## Canonical runtime verification

A temporary verification-only branch `verify-step46-a2` was created from the exact A2 `main` base commit `6d6045ba6b0269f0630c5065690f13aa222f8974`. Draft PR #6 added only a documentation marker, so production source under test was identical to the A2 source on main.

Canonical CI run: `32254152022`
Job: `verify` (`96071833265`)
Runtime: Node `24.18.1`, pnpm `11.21.0`

Results:
- dependency install / frozen lockfile: PASS
- OpenAPI validation: PASS — 513 paths / 582 operations / 1138 refs
- architecture gate: PASS — 351 module files scanned
- project policy gate: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- full runtime tests: **134 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- dedicated Step 46 / A2 domain tests: PASS
- overall `pnpm verify`: PASS
- GitHub Actions job conclusion: SUCCESS

## Closure

**STEP 46 / A2 FINAL GATE = PASS**

**A2 = COMPLETE**

No database migration or HTTP contract was introduced in A2; those belong to A3 and later substeps.

## Next

Step 46 / A3 — PostgreSQL Schema + RBAC.
