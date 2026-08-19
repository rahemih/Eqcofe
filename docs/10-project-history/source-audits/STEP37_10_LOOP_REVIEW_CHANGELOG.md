# EQCOFE Step 37 — Ten-Loop Review Changelog

- Prevented Cart persistence metadata/token hash leakage with explicit presenter allowlists.
- Made Cart/OpenAPI schemas strict and completed missing Cart success response schemas.
- Corrected Create Order request contract; Client no longer supplies quote/reservation IDs.
- Added strict Order address input validation and database snapshot integrity guards.
- Unified cancellation request on reason_code + optional note.
- Closed guest-cart merge + stale quoted-checkout duplicate-order path.
- Added sellability and online-stock checks to Cart add/update while preserving reservation as authoritative stock gate.
- Revalidated Shipping Method at reserve and order creation.
- Added Cart status expiry lifecycle and scheduler task.
- Changed customer Order pagination to stable (created_at,id) cursor.
- Moved pagination into runtime envelope meta.pagination.
- Replaced raw Tax/Shipping list rows with explicit presenters and strict TaxRuleResponse.
- Aligned implemented Step-37 OpenAPI success responses with the actual {success,data,meta} runtime envelope.
- Normalized active Step-37 HTTP success codes.
