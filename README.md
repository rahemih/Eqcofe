# EQCOFE — Equipment Coffee

> **Canonical consolidation status:** 2026-08-19 01:29 UTC-07:00  
> **Trusted state:** see `docs/12-current-state/CURRENT-STATE.md`  
> **Timestamped evidence snapshot:** see `docs/CANONICAL-SNAPSHOT-2026-08-19-0129-UTC-07.md`

EQCOFE is an Iranian e-commerce platform for coffee equipment. This repository is the **official target repository** and is currently under controlled canonical recovery/consolidation.

## Current trust status

Historical recovery evidence identifies **Step 44 — Comprehensive Notification System** as the latest completed implementation and **Step 45 — Articles, Content & SEO** as the next planned step. However, the full Step-44 application tree and its runtime evidence have **not yet been freshly verified on the current official remote `main`**.

Therefore:

- Official repository: `rahemih/Eqcofe`
- Historical repository: `rahemih/digikala-clone` — preserve until migration verification completes
- Last historically recovered completed step: **44**
- Next planned development step: **45**
- Feature development: **FROZEN pending canonical source + build/test/CI verification**
- Money unit: **Toman**
- Wallet: **not part of the product**

Do not treat inherited test numbers as a fresh verification of the current remote tree. The authoritative day-to-day status is `docs/12-current-state/CURRENT-STATE.md`.

## Recovered architecture lineage

The Step-44 canonical artifact is documented as a TypeScript/Node modular monolith using PostgreSQL/Kysely, separate API/Worker/Scheduler processes, OpenAPI contracts, and transactional outbox/inbox patterns. This architecture is subject to final remote-source verification during consolidation.

## Canonical evidence

Connected Google Drive contains:

- `Eqcofe-canonical-import-v1.zip`
- `Eqcofe-canonical-import-v1.bundle`
- `EQCOFE_CANONICAL_REPOSITORY_REPORT.md`

The Drive report records a prepared 782-file canonical repository through Step 44. Import and fresh verification on this official remote remain the active consolidation gate.

## Safe continuation rule

Before Step 45 begins:

1. verify the canonical package and intended source tree;
2. verify/complete import into this repository;
3. run fresh build/typecheck/lint/tests/regression where supported;
4. run/record CI;
5. synchronize canonical documentation and unresolved evidence gaps.

If a historical conversation, README, roadmap or status note conflicts with repository/test evidence, record the conflict and prefer verified implementation/test evidence rather than guessing.
