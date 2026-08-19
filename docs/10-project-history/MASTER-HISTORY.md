# EQCOFE Master Project History

## Origins and product definition
EQCOFE began as a Persian e-commerce project for coffee equipment. Early work established catalog/product UX, retail/wholesale business rules, inventory/physical-store interactions, pricing/FX controls, admin/security requirements, SEO/content/AI ambitions and hosting considerations. WordPress was later superseded by custom code.

## Architecture maturation
The project converged on a SQL-first modular-monolith backend using PostgreSQL, OpenAPI, explicit transactions, outbox/event processing and strict domain ownership. Toman became the canonical money unit and Wallet was removed.

## Recoverable implementation timeline
- Step 28: canonical OpenAPI contract existed (exact full title otherwise only partially recovered).
- Steps 29–30: backend architecture and module specification.
- Step 31: runnable infrastructure scaffold and architecture audit.
- Step 32: Identity/Auth/RBAC/FIDO2.
- Step 33: Catalog.
- Step 34: Pricing Engine.
- Step 35: Inventory Engine.
- Step 36: Procurement Engine.
- Step 37: Cart, Checkout, Tax and Order Core.
- Step 38: Payment Engine and hardening.
- Step 39: Fulfillment.
- Step 40: After-Sales (B1–B12), FINAL CANONICAL.
- Step 41: Finance Core and reporting (A1–A12), FINAL CANONICAL after a later closure correction superseded an earlier blocked candidate.
- Step 42: Customer Core, Addresses, Wishlist and Wholesale/B2B (A1–A12), CLOSED.
- Step 43: Central Store Configuration (A1–A12), CLOSED.
- Step 44: Comprehensive Notification System (A1–A12), CLOSED.
- Step 45: next planned step — Articles, Content & SEO.

## Recovery history
The historical GitHub repository accumulated recovery branches/artifacts and became a partial traceability mirror rather than the complete authoritative application source. Canonical artifacts in project storage/Library were therefore used to recover the complete runnable tree. This import intentionally creates a clean baseline rather than fabricating past commits.

## Current state
Backend development is complete through Step 44. The roadmap continues through Step 67 MVP launch.
