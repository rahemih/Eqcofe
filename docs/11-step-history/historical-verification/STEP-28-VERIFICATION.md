# STEP 28 — Historical Recovery and Canonical Verification

## Classification

- Reconstructed title: **OpenAPI Contract Lineage**
- Historical Attribution: **PARTIAL**
- Current Canonical Verification: **VERIFIED_CURRENT**
- Overall confirmation: **PARTIAL_CONFIRMATION**

## Reconstructed Definition of Done

Retain and validate the OpenAPI contract lineage referenced by later audits.

This Definition of Done is a normalized reconstruction from the read-only canonical roadmap at baseline `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`; it is not represented as verbatim historical wording.

## Historical recovery

The aggregate import and later audits retain an OpenAPI lineage and Step 28 naming, but the exact original requirements and closure evidence are not independently recoverable.

Repository-wide searches covered Git history (all 649 reachable commits), merged/open PR metadata, issues, tags (none returned), remote branches, CI runs, and existing `docs/11-step-history` records. No evidence was promoted beyond what those sources support.

## Current canonical implementation evidence

- contracts/http/openapi.yaml
- scripts/validate-openapi.mjs
- src/generated/openapi.ts
- docs/10-project-history/source-audits/

## Verification

OpenAPI 3.1 validation PASS: 531 paths, 601 operations, 1179 refs. Exact original title/closure wording remains partial.

Shared exact-baseline checks on `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`:

- `pnpm contract:validate`: **PASS** — OpenAPI 3.1, 531 paths, 601 operations, 1179 refs.
- `pnpm arch:check`: **PASS** — 467 files.
- `pnpm policy:check`: **PASS**.
- `pnpm build`: **PASS**.
- `pnpm test` outside the Windows sandbox: **PASS — 610/610**.
- `pnpm verify`: **FAIL before architecture/build/tests** because three Step 54 generated design-system files drift from the Step 54 contract; this is outside Steps 1–28 and was not remediated.
- Fresh PostgreSQL migration apply: **NOT RUN** — Docker/PostgreSQL/psql is unavailable on this host.

## Gaps and decision

Historical attribution is partial, so Step 28 cannot receive a full historical confirmation. Its current OpenAPI capability is verified.

No runtime remediation was made: the proven gaps are missing historical provenance, unavailable live PostgreSQL infrastructure, a current search-runtime gap, or Step 54 drift outside the authorized scope.
