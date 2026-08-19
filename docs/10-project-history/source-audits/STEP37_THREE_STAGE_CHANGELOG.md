# EQCOFE Step 37 — Three-Stage Review Changelog

## Added
- `shared/security/capability-token.ts` for transport-neutral opaque capability hashing/generation.
- Cart→Orders public transaction-aware `CART_ORDER_CHECKOUT_PORT`.
- Public `GET /shipping-methods` and strict public shipping response contract.
- `CART_ACCESS_TOKEN_MAX_ACTIVE` configuration (default 5, runtime capped to 20).
- Migration `0011_step37_hardening.sql` with scheduler/cursor indexes and deferred commitment/snapshot integrity.
- Explicit Idempotency-Key format/length validation.
- Safe MoneyToman checkout accumulation and BigInt tax rounding.

## Changed
- Quote revalidates current online inventory.
- Reserve detects another advanced Checkout before reservation creation.
- Orders no longer reads Cart persistence directly; Cart owns checkout capability and state access.
- Order deferred integrity validates Cart/Checkout/Reservation/Customer lineage, exact monetary headers and exact item snapshot equivalence.
- Cart TTL is extended through Quote/Reserve lifetimes.
- Cart status transitions increment version.
- Capability access errors use 401; stale/concurrent workflow errors use 409.
- Customer Cart access-token issuance prunes expired/older secondary capabilities.
- Shipping DB reads use explicit allowlisted projections.
- Order finalization verifies Cart/Checkout state transitions instead of silently depending on deferred DB failure.
- README now describes the current Step-37 baseline instead of the obsolete scaffold-only state.

## Removed
- Stale unregistered `ConfirmOrderCommand/Handler`, unused OrderRepository port and unsafe sample OrderAggregate from Step 31.
- Stale `test/order.aggregate.spec.ts`.
- Stale compiled `dist/` from the artifact.
- Stale historical file manifests that no longer represented the repository contents.

## Preserved intentionally
- Payment-driven Order confirmation remains unimplemented in Step 37 and must be introduced by Step 38 rather than exposing an unsafe manual confirmation shortcut.
- PostgreSQL/Node dependency-backed execution remains an explicit real-environment gate.
