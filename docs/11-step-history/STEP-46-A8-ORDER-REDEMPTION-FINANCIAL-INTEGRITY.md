# EQCOFE — Step 46 / A8

## Order + Redemption + Financial Integrity

**Status:** COMPLETE / FINAL GATE PASS

## Implemented lifecycle
A8 binds the frozen Redemption lifecycle to authoritative commerce transactions:
- Checkout `quoted -> reserved` atomically creates Marketing `reserved` redemptions from the immutable A7 marketing snapshot.
- Checkout `reserved -> expired/cancelled` atomically releases still-reserved redemptions.
- Order insert atomically consumes the exact Checkout redemptions for that Order.
- Order transition to `cancelled/expired` reverses consumed redemptions while retaining immutable historical facts.

No Marketing redemption is deleted to undo usage. History is preserved through `reserved -> consumed`, `reserved -> released`, and `consumed -> reversed`.

## Concurrency and usage-limit integrity
Reservation is serialized with PostgreSQL transaction advisory locks and row locks:
- promotion locks protect `total_usage_limit` and `per_customer_usage_limit`;
- coupon locks protect coupon-level total/per-customer usage limits;
- first-purchase reservations additionally lock by customer identity;
- first-purchase is rechecked against authoritative paid Orders at reservation time;
- a customer cannot concurrently reserve first-purchase discounts on another Checkout.

Usage accounting counts only active commitments (`reserved` + `consumed`), so released/reversed history does not permanently consume a limit.

## Financial and snapshot integrity
A8 adds database-level validation that:
- Checkout marketing snapshot is an object with a valid applications array;
- every application has a valid source, Promotion/Campaign identity and positive integer-Toman discount;
- automatic applications cannot carry coupon identity;
- duplicate Promotion applications in one snapshot fail closed;
- `pricing_net_toman` must equal authoritative Checkout subtotal minus Pricing discount;
- application discount sum must equal `marketing_discount_toman`;
- Marketing discount cannot exceed Pricing-net merchandise subtotal;
- consumed/reversed Order redemption totals and counts must equal the immutable Order marketing snapshot.

The financial constraint trigger is `DEFERRABLE INITIALLY DEFERRED` so multi-row redemption transitions are validated against final transaction state rather than transient intermediate state.

## Persistence hardening
Migration `0039_marketing_redemption_integrity.sql`:
- adds authoritative Checkout/Order foreign keys for Redemption;
- adds positive redemption-discount constraint and lifecycle indexes;
- adds immutable-fact and state-transition guards;
- attaches reservation/release/consume/reverse triggers to Commerce state changes;
- adds deferred cross-checks between Checkout/Order snapshots and Redemption history.

Migration `0040_marketing_redemption_runtime_hardening.sql` hardens audited trigger edge cases, including terminal Order reversal while Checkout remains `order_created` and safe INSERT/UPDATE/DELETE trigger context handling.

## Verification coverage
`test/marketing-step46-a8.spec.ts` covers foreign keys, snapshot validation, promotion/coupon concurrency locks, first-purchase race protection, reserve/release/consume/reverse wiring, immutable lifecycle enforcement, deferred financial integrity and domain idempotency.

## Canonical CI verification
Verification-only Draft PR #13 tested the exact A8 source already present on `main`; its branch added only a documentation trigger marker and was not merged.

Final GitHub Actions Canonical CI run `32261752597`, job `verify` (`96096410165`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 362 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A8 tests: **11/11 PASS**
- runtime tests: **184 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A8 FINAL GATE = PASS**
**A8 = COMPLETE**

## A8/A9 boundary
A8 closes Order/Redemption financial integrity only. Loyalty points earning/redeeming and Customer Club operational workflows are not claimed here.

## Next approved substep
**Step 46 / A9 — Customer Club / Points MVP Foundation**
