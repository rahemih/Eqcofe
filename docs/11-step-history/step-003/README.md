# Step 003 — Database & Migration Foundation

## Record classification

- Reconstructed title: **Database & Migration Foundation**
- Historical Attribution: **UNVERIFIED**
- Current Canonical Verification: **VERIFIED_CURRENT**
- Overall confirmation: **NOT_HISTORICALLY_CONFIRMED**
- Documentation status: **RECONSTRUCTED-HISTORY / VERIFIED_CURRENT**

## Reconstructed Definition of Done

Establish PostgreSQL migration ordering, durable identifiers, timestamps, checksums, and integrity conventions.

This Definition of Done is a normalized reconstruction from the read-only canonical roadmap at baseline `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`; it is not represented as verbatim historical wording.

## Historical recovery

GitHub repository on 2026-08-19 received the aggregate commit b239dfe825b615f36caf2e26cc7abc80c70d349c ("Import verified canonical EQCOFE source through Step 44"). No pre-import per-Step commits, PRs, issues, tags, or branch lineage independently attributes this capability to the numbered Step.

Repository-wide searches covered Git history (all 649 reachable commits), merged/open PR metadata, issues, tags (none returned), remote branches, CI runs, and existing `docs/11-step-history` records. The predecessor-repository and Google Drive backup audits independently corroborate the absence of attributable Step 01–27 records. No evidence was promoted beyond what those sources support.

## Current canonical implementation evidence

- database/migrate.ts
- database/migrations/0001_create_schemas.sql
- database/migrations/0002_event_platform.sql
- docs/04-database/README.md

## Verification

Migration source and clean-lineage tests exist. Canonical Step 52 evidence records a real clean PostgreSQL execution of all 65 migrations with all 65 checksums matching, plus zero unvalidated constraints and zero invalid indexes. This later verification covers and supersedes the audit host's lack of local PostgreSQL.

Shared exact-baseline checks on `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`:

- `pnpm contract:validate`: **PASS** — OpenAPI 3.1, 531 paths, 601 operations, 1179 refs.
- `pnpm arch:check`: **PASS** — 467 files.
- `pnpm policy:check`: **PASS**.
- `pnpm build`: **PASS**.
- Baseline `pnpm test` outside the Windows sandbox: **PASS — 610/610**; latest bounded-remediation regression: **PASS — 614/614**.
- `pnpm verify`: **FAIL before architecture/build/tests** because three Step 54 generated design-system files drift from the Step 54 contract; this is outside Steps 1–28 and was not remediated.
- Fresh PostgreSQL migration apply on this host: **NOT RUN**. Canonical clean PostgreSQL evidence: **PASS — 65/65 migrations and checksums** in `STEP-52-A12-FINAL-CANONICAL-CLOSURE.md`.

## Gaps and decision

Historical attribution is unverified, so the numbered Step cannot be honestly marked historically complete even though the current capability is verified.

No database code was changed for Step 03. The prior limitation was an evidence-discovery gap resolved by canonical Step 52 PostgreSQL records, not by fabricating a new run.

## Evidence index

- [Steps 01–28 Evidence Matrix](../historical-verification/EVIDENCE-MATRIX.md)
- [Legacy Repository Recovery](../historical-verification/LEGACY-REPOSITORY-RECOVERY.md)
- [Google Drive Backup Recovery](../historical-verification/DRIVE-BACKUP-RECOVERY.md)
