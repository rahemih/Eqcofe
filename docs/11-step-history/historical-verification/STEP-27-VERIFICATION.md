# STEP 27 — Historical Recovery and Canonical Verification

## Classification

- Reconstructed title: **Test, Build & Verification Foundation**
- Historical Attribution: **UNVERIFIED**
- Current Canonical Verification: **VERIFIED_CURRENT**
- Overall confirmation: **NOT_HISTORICALLY_CONFIRMED**

## Reconstructed Definition of Done

Establish automated contract, architecture, policy, build, and test gates.

This Definition of Done is a normalized reconstruction from the read-only canonical roadmap at baseline `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`; it is not represented as verbatim historical wording.

## Historical recovery

GitHub repository on 2026-08-19 received the aggregate commit b239dfe825b615f36caf2e26cc7abc80c70d349c ("Import verified canonical EQCOFE source through Step 44"). No pre-import per-Step commits, PRs, issues, tags, or branch lineage independently attributes this capability to the numbered Step.

Repository-wide searches covered Git history (all 649 reachable commits), merged/open PR metadata, issues, tags (none returned), remote branches, CI runs, and existing `docs/11-step-history` records. No evidence was promoted beyond what those sources support.

## Current canonical implementation evidence

- .github/workflows/ci.yml
- package.json
- scripts/run-tests.mjs
- scripts/check-architecture.mjs
- scripts/check-project-policies.mjs

## Verification

OpenAPI PASS; architecture PASS (467 files); policy PASS; build PASS; tests 610/610 PASS outside sandbox. Full pnpm verify is currently blocked by unrelated Step 54 generated-artifact drift.

Shared exact-baseline checks on `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`:

- `pnpm contract:validate`: **PASS** — OpenAPI 3.1, 531 paths, 601 operations, 1179 refs.
- `pnpm arch:check`: **PASS** — 467 files.
- `pnpm policy:check`: **PASS**.
- `pnpm build`: **PASS**.
- `pnpm test` outside the Windows sandbox: **PASS — 610/610**.
- `pnpm verify`: **FAIL before architecture/build/tests** because three Step 54 generated design-system files drift from the Step 54 contract; this is outside Steps 1–28 and was not remediated.
- Fresh PostgreSQL migration apply: **NOT RUN** — Docker/PostgreSQL/psql is unavailable on this host.

## Gaps and decision

Historical attribution is unverified, so the numbered Step cannot be honestly marked historically complete even where the current capability is verified.

No runtime remediation was made: the proven gaps are missing historical provenance, unavailable live PostgreSQL infrastructure, a current search-runtime gap, or Step 54 drift outside the authorized scope.
