# EQCOFE — Step 46 / A4

## Campaign Lifecycle Engine

**Status:** IMPLEMENTED / CI VERIFICATION PENDING

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

## Closure gate

A4 becomes COMPLETE only after Canonical CI passes against the exact A4 main source.
