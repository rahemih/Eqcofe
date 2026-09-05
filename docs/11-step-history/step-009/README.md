# Step 009 — Catalog Search, Filtering & Read Models

## Record classification

- Reconstructed title: **Catalog Search, Filtering & Read Models**
- Historical Attribution: **UNVERIFIED**
- Current Canonical Verification: **VERIFIED_CURRENT**
- Overall confirmation: **NOT_HISTORICALLY_CONFIRMED**
- Documentation status: **RECONSTRUCTED-HISTORY / VERIFIED_CURRENT**

## Reconstructed Definition of Done

Prepare search, category/brand filtering, listing, and storefront read models.

This Definition of Done is a normalized reconstruction from the read-only canonical roadmap at baseline `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`; it is not represented as verbatim historical wording.

## Historical recovery

GitHub repository on 2026-08-19 received the aggregate commit b239dfe825b615f36caf2e26cc7abc80c70d349c ("Import verified canonical EQCOFE source through Step 44"). No pre-import per-Step commits, PRs, issues, tags, or branch lineage independently attributes this capability to the numbered Step.

Repository-wide searches covered Git history (all 649 reachable commits), merged/open PR metadata, issues, tags (none returned), remote branches, CI runs, and existing `docs/11-step-history` records. The predecessor-repository and Google Drive backup audits independently corroborate the absence of attributable Step 01–27 records. No evidence was promoted beyond what those sources support.

## Current canonical implementation evidence

- src/modules/catalog/application/catalog-query.service.ts
- src/modules/catalog/infrastructure/catalog.repository.ts
- src/modules/catalog/presentation/catalog.controller.ts
- test/catalog-search-step09.spec.ts
- contracts/http/openapi.yaml (/search, filters, suggestions)

## Verification

Category/brand filters, listing, attributes and pagination already existed. The authorized remediation adds Catalog-owned runtime handlers for `/search` and `/search/suggestions`, bounded query/limit handling, published-product-only SQL search across product/brand/category fields, deterministic suggestions, price decoration, and cursor pagination. A separate `src/modules/search` is not required because Catalog owns the authoritative product read model.

Shared exact-baseline checks on `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`:

- `pnpm contract:validate`: **PASS** — OpenAPI 3.1, 531 paths, 601 operations, 1179 refs.
- `pnpm arch:check`: **PASS** — 467 files.
- `pnpm policy:check`: **PASS**.
- `pnpm build`: **PASS**.
- Baseline `pnpm test` outside the Windows sandbox: **PASS — 610/610**; latest bounded-remediation regression: **PASS — 614/614**.
- `pnpm verify`: **FAIL before architecture/build/tests** because three Step 54 generated design-system files drift from the Step 54 contract; this is outside Steps 1–28 and was not remediated.
- Fresh PostgreSQL migration apply: **NOT RUN** — Docker/PostgreSQL/psql is unavailable on this host.
- Remediation regression: **PASS — 614/614**, including four focused Step 09 search tests; TypeScript build and OpenAPI validation PASS.

## Gaps and decision

Historical attribution remains unverified, so the original numbered Step cannot be honestly marked historically complete. The current canonical capability is now verified.

Runtime remediation was limited to the missing Catalog search read path and its tests. It introduced no migration, write authority, Step 29+ change, or Roadmap status change.

## Evidence index

- [Steps 01–28 Evidence Matrix](../historical-verification/EVIDENCE-MATRIX.md)
- [Legacy Repository Recovery](../historical-verification/LEGACY-REPOSITORY-RECOVERY.md)
- [Google Drive Backup Recovery](../historical-verification/DRIVE-BACKUP-RECOVERY.md)
