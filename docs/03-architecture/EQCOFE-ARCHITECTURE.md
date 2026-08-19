# EQCOFE Architecture

## Style
SQL-first modular monolith with explicit domain/application/infrastructure/presentation boundaries.

## Runtime topology
- API process — Fastify/NestJS HTTP surface
- Worker process — transactional outbox/event inbox/asynchronous jobs/provider delivery
- Scheduler process — lifecycle expiry and maintenance tasks
- PostgreSQL — primary durable store
- Redis/BullMQ — asynchronous infrastructure where applicable

## Major business modules
Identity/Admin, Catalog, Pricing, Inventory, Procurement, Cart, Checkout, Orders, Payments, Fulfillment, After-Sales, Finance, Customer, Configuration, Notifications, plus planned Content/Marketing/Integrations/AI/POS/Analytics modules.

## Boundary rules
- Domain modules own their tables/state.
- Cross-module use goes through public/application ports and events rather than direct foreign persistence access.
- Important async integration uses transactional outbox/event inbox patterns.
- External network/provider operations happen after durable commit, not inside core state transactions.

## Contracts
- HTTP: `contracts/http/openapi.yaml` (OpenAPI 3.1)
- Events: `contracts/events/`
- Generated HTTP types: `src/generated/openapi.ts`

## Security architecture
Identity owns sessions/auth. Admin operations use permission-based RBAC; critical operations additionally use Step-Up and idempotency. Secrets remain environment-owned.

## Data integrity
Integrity-critical invariants are pushed into PostgreSQL constraints/indexes/triggers where appropriate, supplemented by transaction locks/CAS/application guards and real DB concurrency tests.
