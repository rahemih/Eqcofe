# Step 38 Changelog

- Added `0012_payment_engine.sql` with payments, attempts, webhook inbox, refunds, payment/order amount invariant, refund cap, order payment projection and payment/refund permissions.
- Added provider-agnostic payment/refund contracts and fail-closed configured provider adapter.
- Added PaymentService and PaymentsController for guest/customer initiation, verify/status, provider callback, webhook, admin reconciliation and refund operations.
- Added Orders-owned payment port and order confirmation/payment-state projection.
- Hardened Inventory conversion and late-payment review to be idempotent for crash recovery.
- Added automatic compensating refund creation for paid cancelled orders or late payments whose stock cannot be reacquired.
- Added guest order capability TTL and raw-body webhook support.
- Added scheduler payment reconciliation.
- Added payment/refund/order-confirmed event schemas.
- Aligned OpenAPI payment/refund routes and schemas with the implemented controller surface.
