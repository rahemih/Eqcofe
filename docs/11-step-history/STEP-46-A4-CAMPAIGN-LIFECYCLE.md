# EQCOFE — Step 46 / A4

## Campaign Lifecycle Engine

**Status:** COMPLETE / FINAL GATE PASS

## Implemented

- Campaign application service for create/read/list and lifecycle commands.
- PostgreSQL-backed Campaign repository.
- Transactional lifecycle mutations.
- Optimistic concurrency through expected campaign version.
- Row locking before lifecycle mutation.
- Audit trail for create, state transitions and reschedule.
- Transactional outbox domain events for campaign lifecycle changes.
- Marketing module registration/export.
- Additive A4 lifecycle-hardening migration.

## Canonical lifecycle

`draft -> active -> paused -> active`

Terminal paths:
- `draft -> ended -> archived`
- `active -> ended -> archived`
- `paused -> ended -> archived`
- `draft -> archived`
- `paused -> archived`

Active campaigns cannot be archived directly. Archived campaigns are immutable. Physical DELETE is rejected.

## A3/A4 reconciliation

A2 domain already supported `ended`, while the initial A3 PostgreSQL campaign status CHECK omitted it. A4 corrects this via additive migration `0036_marketing_campaign_lifecycle.sql`; no previous migration was rewritten.

## Concurrency and integrity

- lifecycle updates require `expectedVersion`;
- service locks the campaign row before transition;
- UPDATE uses both expected version and allowed source states;
- version increments on successful mutation;
- stale/concurrent changes fail closed with `CAMPAIGN_VERSION_CONFLICT`;
- database trigger independently rejects invalid lifecycle transitions and rescheduling outside draft/paused.

## Verification coverage

`test/marketing-step46-a4.spec.ts` covers domain lifecycle, expired activation, database state alignment, transition guards, optimistic concurrency, audit/outbox integration, staff/version requirements, reschedule constraints and module wiring.

## Canonical CI evidence

Verification-only Draft PR #8 tested the exact A4 main base commit `327a80ddc331e89aecc2edade779966639330d1c`; the branch added only a documentation marker.

GitHub Actions Canonical CI run `32255765865`, job `verify` (`96076979001`) completed successfully:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 354 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A4 lifecycle tests: 8/8 PASS
- runtime tests: **148 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A4 FINAL GATE = PASS**
**A4 = COMPLETE**

## Next approved substep

Step 46 / A5 — Coupon + Eligibility Engine.
