# EQCOFE — Equipment Coffee

EQCOFE is an Iranian e-commerce platform for coffee equipment, built as a SQL-first modular monolith with PostgreSQL, explicit transaction boundaries, transactional outbox delivery, worker/scheduler processes, and an OpenAPI-first HTTP contract.

## Canonical status

This repository is the canonical EQCOFE backend source through **Step 52 — Backend Final Closure** and the canonical product-design contract source through **Step 53 — Information Architecture & User Journeys**.

- Last fully closed step: **53 — Information Architecture & User Journeys — FINAL GATE PASS**
- Product-design step: **53 — Information Architecture & User Journeys — FINAL GATE PASS**
- Active product-design step: **54 — RTL Design System & Accessibility Foundation — A1–A10 PASS / A11 BLOCKED**
- Money unit: **Toman**
- Wallet: **not part of the product**
- Node: `>=24.18.1 <25`
- Package manager: `pnpm@11.21.0`
- Latest verified full runtime regression: **578/578 PASS**
- Latest verified OpenAPI: **531 paths / 601 operations / 1179 refs — PASS**
- Latest verified architecture gate: **467 files — PASS**
- Fresh isolated PostgreSQL migration verification: **65/65 migrations PASS; checksums MATCH**
- Step-53 experience contract: **7 actors / 24 journeys / 153 OpenAPI operation references — PASS**
- Step-54 foundation contract: **35 primitive colors / 19 semantic roles / 13 type styles / 13 component families / 12 accessibility requirements — PASS**

> Import provenance matters: the historical GitHub repository was a partial traceability/recovery mirror. The runnable source in this import comes from the final Step-44 canonical artifact, not from pretending the old GitHub `main` tree was complete.

## Technology stack

- TypeScript 6 / Node.js 24
- NestJS 11 + Fastify
- PostgreSQL + Kysely
- Redis + BullMQ
- OpenAPI 3.1
- Transactional Outbox / event inbox patterns
- Separate API, Worker and Scheduler processes

## Repository layout

- `apps/api` — HTTP process
- `apps/worker` — asynchronous event/outbox/delivery processing
- `apps/scheduler` — scheduled lifecycle/maintenance tasks
- `src/modules` — business modules
- `src/platform` — platform services and cross-cutting infrastructure
- `src/shared` — shared kernel primitives
- `database/migrations` — ordered PostgreSQL migrations
- `contracts/http` — canonical OpenAPI contract
- `contracts/events` — event schemas
- `test` — runtime/invariant tests
- `scripts` — contract, architecture, policy and test tooling
- `docs` — canonical product, architecture, history, decisions and current-state documentation

## Setup

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:migrate
pnpm verify
```

Development processes:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:scheduler
```

The default sample environment is fail-closed for live payment/provider behavior. Never commit real credentials.

## Documentation index

- Product vision: `docs/01-product-vision/EQCOFE-PRODUCT-VISION.md`
- Business rules: `docs/02-business-rules/EQCOFE-BUSINESS-RULES.md`
- Architecture: `docs/03-architecture/EQCOFE-ARCHITECTURE.md`
- Database: `docs/04-database/README.md`
- API: `docs/05-api/README.md`
- Security: `docs/06-security/README.md`
- Testing: `docs/07-testing/README.md`
- Decisions / ADRs: `docs/09-decisions/`
- Project history: `docs/10-project-history/MASTER-HISTORY.md`
- Step history: `docs/11-step-history/`
- Current state: `docs/12-current-state/CURRENT-STATE.md`
- Completeness matrix: `docs/12-current-state/COMPLETENESS-MATRIX.md`
- Unverified register: `docs/12-current-state/UNVERIFIED-REGISTER.md`
- Roadmap: `ROADMAP.md`

## Provenance and historical accuracy

No fake historical Git commits are manufactured in this repository. Earlier decisions/steps are documented from recoverable artifacts, code, tests, Git evidence, Google Drive and project context. Anything not sufficiently recoverable is explicitly marked `UNVERIFIED` or `PARTIAL`.
