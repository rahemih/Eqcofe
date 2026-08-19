# EQCOFE Step 37 — Cart, Checkout, Tax & Order Core Audit

## Status
**PASS with two real-environment gates.**

Step 37 was completed on top of the final Step 36 repository. The final regression found and corrected the remaining contract drift plus additional security/consistency defects before this audit was closed.

## Implemented scope
- Guest and customer carts with opaque capability tokens stored only as SHA-256 hashes.
- Customer cart acquisition/merge with PostgreSQL advisory locking to serialize active-cart creation/merge.
- Cart mutation locking and cart-version snapshots.
- Quote generation from current Catalog + Pricing + scoped Tax rules.
- Sales-stop revalidation at cart quote, reservation, and final order creation.
- Shipping methods with admin create/update, optimistic concurrency and audit.
- Scoped tax rules: Product > Brand > Category > Global, explicit zero-rate rules supported, fail-closed when no rule exists.
- Tax admin lifecycle draft -> active -> expired, Step-Up for activate/expire, audit and DB overlap exclusion.
- Checkout capability, quote expiry, reservation linkage, and one advanced checkout per cart.
- Reservation -> order linkage extends Inventory to payment_pending and aligns payment_grace_until with the order pending timeout.
- Atomic Order creation with immutable product/pricing/tax/address snapshots.
- Guest order access/cancellation requires X-Checkout-Token; customer order access enforces customer ownership.
- Customer order list/detail/timeline/invoice/cancel routes.
- Order created/submitted/cancelled/expired Outbox events and JSON Schemas.
- Scheduler reconciliation for expired checkout, pending order and inventory reservations.
- Database deferred total guards for Checkout and Order snapshots.

## Important fixes found during finalization
1. Corrected Merge response contract to CartMergeResponse.
2. Removed obsolete Step-28 routes that exposed cart capability values in URL paths.
3. Added X-Cart-Token and X-Checkout-Token security schemes/metadata to active capability routes.
4. Closed an IDOR/security defect where guest orders could be read/cancelled by order number alone.
5. Added customer ownership filtering for customer order reads/cancellation.
6. Fixed Tax Brand/Category scope propagation from Catalog into Quote calculation.
7. Aligned Reservation payment grace with Order pending timeout to prevent premature stock release.
8. Added Cart/Checkout/Order expiry orchestration to Scheduler.
9. Removed full DomainModulesModule from Worker/Scheduler process bootstraps; background processes now load only required runtime modules.
10. Added PostgreSQL FK/check/deferred consistency constraints for cart, checkout, tax and order snapshots.
11. Added PostgreSQL tax scope-target validation and active-period overlap exclusion.
12. Scoped Idempotency to X-Cart-Token as well as X-Checkout-Token/customer identity.
13. Added Postgres error mapping for invalid UUID/data, exclusion conflicts and concurrency/deadlock failures.
14. Added admin Shipping Method and Tax Rule APIs so Checkout is operable without direct SQL setup.

## Automated/static audit
- TypeScript files in apps/src/database: 171
- Architecture check: PASS
- Toman / No-Wallet / config-boundary policy: PASS
- OpenAPI paths: 498
- OpenAPI operations: 565
- Local OpenAPI refs checked: 978
- Broken local refs: 0
- Duplicate operationId: 0
- Duplicate operation parameters: 0
- Step-37 required HTTP operations: 25
- Missing Step-37 operations: 0
- Legacy cart-token-in-URL paths: 0
- Capability-route security metadata failures: 0
- Order event JSON schemas: 4
- Step-37 pure/domain/static assertions: 32/32 PASS
- Intrinsic TypeScript errors in Step-37 touched scope after excluding missing-environment dependency/type errors: 0
- Architecture direct DB/controller boundary regression: 0 (architecture script PASS)

## Database invariants checked statically
- One active cart per customer.
- One reserved/order-created checkout per cart.
- Positive cart/order quantities.
- Toman amounts are integer/nonnegative.
- Checkout/order header total formula is checked.
- Checkout/order line discount and total formulas are checked.
- Deferred commit-time line/header reconciliation exists for checkout and order.
- Order has unique checkout and unique reservation linkage.
- Tax rule scope shape is checked.
- Tax scope entity existence is checked by trigger.
- Active tax periods for the same scope cannot overlap.
- Tax rule ID is snapshotted on checkout/order lines.

## Security conclusions
- Raw cart/checkout capability tokens are not persisted; hashes are persisted.
- Cart token is not carried in URL paths.
- Guest order access requires the checkout capability.
- Customer order access is owner-scoped.
- Admin tax activation/expiry is Step-Up protected.
- Admin mutable tax/shipping resources use If-Match/versioning.
- Idempotency scope uses actor/checkout/cart capability, avoiding cross-guest key collisions.

## Real-environment gates (not falsely marked PASS)
1. Full dependency-backed build/test requires Node 24 plus pnpm install; this artifact environment has Node 22 and no node_modules.
2. Migration 0010 must be executed in CI against real PostgreSQL 18, including concurrent tax activation, concurrent cart/checkout creation, deferred-constraint and row-lock tests.

No known internal Step-37 contract/domain/security defect remains after the final regression within the implemented scope.
