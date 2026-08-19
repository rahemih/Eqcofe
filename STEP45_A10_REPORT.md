# EQCOFE Step 45 / A10 — Scheduled Publishing Worker + Audit/Outbox/Operations

Status: COMPLETE / PASS
Date: 2026-08-19
Baseline: Step 45 A9 COMPLETE

## Implemented
- Added `ArticleOperationsService` for due scheduled publication and operational summary.
- Scheduler runs content scheduled publication every minute through `ArticleOperationsService.publishDue(50)`.
- Due rows are claimed with `FOR UPDATE SKIP LOCKED`, ordered by `(scheduled_at,id)` and bounded to 100.
- Only `status='scheduled' AND scheduled_at<=now()` rows are eligible; future schedules are never published early.
- System publication atomically sets `status=published`, clears `scheduled_at`, designates `current_version_id` as `published_version_id`, adopts the current version slug, updates publish timestamps and increments optimistic version.
- Publication is idempotent at the database boundary: once status is no longer scheduled, the same job changes 0 rows.
- Scheduled publication creates immutable transition history, system audit and `content.article.published.v1` transactional outbox event in the same transaction.
- Slug conflict or missing current version fails closed; article remains scheduled and a system audit entry `content.article.scheduled_publish_blocked` is written.
- Added admin operations read model with `scheduled_total`, `scheduled_due`, `scheduled_future`, `published_total`, `in_review_total`, and `oldest_due_seconds`.
- Added `GET /admin/content/articles/operations/summary`, protected by `content.view`; OpenAPI and generated types updated.
- No new lifecycle status, provider/network call, AI/Marketing feature, or database migration was added.

## Verification
- A10 structural/security audit: 20/20 PASS.
- A10 dedicated tests: 6/6 PASS.
- Node 24.18.1 / TypeScript 6.0.3 production build: PASS, 0 errors.
- Full runtime regression: 144/144 PASS.
- OpenAPI validation: PASS — 514 paths / 583 operations / 1146 refs.
- Architecture: PASS — 357 files.
- Toman / No-Wallet / configuration-boundary policy: PASS.
- PostgreSQL 18.4 isolated behavior gate: PASS.
- PostgreSQL fixture showed exactly one due article claim, while future scheduled article was excluded.
- Due article published with the current version as the public snapshot and current-version slug.
- Re-running the publication update changed 0 rows; future scheduled count remained 1 and due remaining became 0.
- Verification branch `br-sweet-wildflower-avk0gyzj` deleted; main/default database unchanged.

## Boundaries preserved
- No Content provider/network dependency.
- No new persistence table or lifecycle state invented for scheduler processing.
- No Category/Tag/AI/Marketing/Frontend implementation.
- Manual publication lifecycle from A5 remains authoritative; scheduler only executes the already-approved scheduled transition when due.
- A11 remains responsible for deeper concurrency/security/10-cycle verification.

## Environment / traceability note
The executable A10 workspace is an extracted canonical tree and does not contain `.git` metadata. No commit hash is invented. Source, tests, audit, generated OpenAPI types and the complete A10 artifact are persisted for later commit/publish to the canonical repository checkout.

## Next
Step 45 / A11 — E2E + PostgreSQL Concurrency + Security + 10-cycle Regression.
