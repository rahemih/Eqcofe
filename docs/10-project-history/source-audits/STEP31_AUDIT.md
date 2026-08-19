# EQCOFE Step 31 — Scaffold Audit

## Result

**Status: PASS with one environment gate**

The repository scaffold is structurally complete for Step 31. Static architecture, policy, OpenAPI, import, migration, event-platform and domain tests passed. A full dependency-backed NestJS build must be executed on a Node 24 environment after `pnpm install`; package installation is not available in the current artifact-generation environment.

## Audited scope

- API / Worker / Scheduler bootstrap separation
- NestJS/Fastify API bootstrap
- PostgreSQL/Kysely connection and TransactionManager
- Redis connection and health readiness
- BullMQ queue bootstrap isolated to Worker
- Transactional Outbox publisher using `FOR UPDATE SKIP LOCKED`
- Event consumer registry and consumer inbox idempotency scaffold
- Request context before Guards through middleware
- Fail-closed authentication bootstrap
- RBAC / Step-Up guard scaffold
- Idempotency lease/replay scaffold
- Standard success/error envelope
- SQL-first migration runner with advisory lock and checksums
- OpenAPI Step 28 contract retained unchanged
- Domain module registration
- Orders vertical-slice example
- MoneyToman integer value object
- Architecture and policy scripts
- Domain unit tests

## Counts

- OpenAPI operations: 506
- OpenAPI local `$ref` occurrences checked: 798
- Broken local `$ref`: 0
- Duplicate `operationId`: 0
- Admin operations lacking operation-level security: 0
- Domain modules: 26
- Cross-domain import edges in current scaffold: 0
- Domain dependency cycles: 0
- SQL migrations: 2
- TypeScript files syntax-scanned: 90
- Domain tests executed: 4
- Domain tests passed: 4

## Policy checks

- Legacy `*_irr` money fields in TypeScript: 0
- Wallet references in TypeScript: 0
- Domain imports of NestJS/Kysely/pg/ioredis: 0
- Presentation direct DB access: 0
- Cross-module repository imports: 0
- Relative imports with unresolved local targets: 0
- Destructive `DROP TABLE` / `DROP SCHEMA` in initial migrations: 0

## Contract integrity

The copied Step 28 OpenAPI contract SHA-256 is:

`0681159496a4d54fa9d89fc3587c267d2f73d81ded7e8eeb9e02cb7c688c16b2`

This matches the Step 28 final contract hash.

## First real-environment gate

On a development machine or CI runner with Node 24 and network/package-registry access:

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm contract:validate
pnpm contract:types
pnpm build
pnpm test
pnpm arch:check
pnpm policy:check
```

Then start PostgreSQL/Redis and run:

```bash
docker compose -f docker-compose.dev.yml up -d
pnpm db:migrate
pnpm dev:api
pnpm dev:worker
pnpm dev:scheduler
```

The first full build/install run should generate and commit `pnpm-lock.yaml`. Production containerization should use that frozen lockfile.

## Intentionally not implemented in Step 31

Step 31 is the executable infrastructure scaffold, not implementation of all business endpoints. The following remain for later implementation steps:

- 506 HTTP operation handlers
- Full domain tables/migrations from Steps 21–23
- Identity/FIDO2 cryptographic implementation
- Concrete OrderRepository and other domain repositories
- Consumer-owned event handlers
- Process manager business logic
- Real payment/SMS/shipping/currency/AI adapters
- Full OpenTelemetry exporters and production dashboards

These are not scaffold defects; they are subsequent implementation work on top of this repository.
