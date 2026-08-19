# EQCOFE Step 44 / A10 — Operational Scheduler + Delivery Read Models + Audit/Outbox/Observability

Status: COMPLETE / PASS
Date: 2026-08-19
Baseline: Step 44 A9 COMPLETE / canonical A9 artifact

## Implemented
- Added migration `0033_notification_operations.sql` with `scheduled_at` support and operational indexes for scheduled intents and stale processing deliveries.
- Internal notification command now accepts valid future `scheduled_at` and persists it on the notification intent.
- Delivery claim explicitly excludes future scheduled intents; due scheduled work becomes claimable without rewriting the intent.
- Added `NotificationDeliveryWorkerService` in the Worker process. It continuously calls `NotificationDeliveryService.processBatch()` with bounded batch/poll configuration.
- Provider calls remain in the Worker; Scheduler does not perform outbound provider sends.
- Added `NotificationOperationsService` and a once-per-minute scheduler maintenance task for stale-processing recovery.
- Stale processing recovery closes any orphan `started` attempt as `retryable_failed`, moves the non-terminal delivery to `retry_wait`, clears `processing_started_at`, and records `NOTIFICATION_WORKER_STALE`.
- Stale recovery is transactional, audited, logged, bounded, and does not touch terminal deliveries.
- Added admin operations summary read model with intent/delivery counts, future scheduled count, stale processing count, failed attempts in 24h, and oldest due backlog age.
- Added `GET /admin/notifications/operations/summary` under the existing `notifications.view` read permission.
- OpenAPI and generated TypeScript contracts were regenerated.

## Verification
- A10 audit: 19/19 PASS.
- A10 dedicated tests: 6/6 PASS.
- Full runtime regression: 127/127 PASS.
- TypeScript build: PASS, 0 errors.
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs.
- Architecture: PASS — 345 files.
- Toman / No-Wallet / configuration-boundary policy: PASS.
- PostgreSQL 18.4 isolated verification: PASS.
- A future scheduled intent was excluded from due delivery selection.
- A due scheduled intent was selected as claimable.
- A stale processing delivery recovered to `retry_wait` and its open attempt closed as `retryable_failed` with `NOTIFICATION_WORKER_STALE`.
- Operational summary correctly reported one future scheduled item, zero stale items after recovery, and one failed attempt in the 24h window.
- Verification branch deleted; main/default database unchanged.

## Boundaries preserved
- No live SMS/email provider, credential or vendor SDK added; Step 47 remains provider integration scope.
- Provider network calls do not execute in Scheduler transactions.
- No frontend notification UI added.
- No cross-domain SQL ownership violation introduced.
- Existing audit/outbox semantics from enqueue, delivery, retry, template mutations and in-app acknowledgement remain intact.

## Next
Step 44 / A11 — E2E + PostgreSQL Concurrency + Security + 10-cycle Regression.
