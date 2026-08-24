# Step 51 / A13 — Hardened Management HTTP / RBAC / OpenAPI

**Status:** COMPLETE / FINAL GATE PASS

## Scope
A13 exposes only the existing A4–A10 bounded Analytics management read models and the A12 export application boundary. Analytics remains non-authoritative and gains no cross-domain mutation authority.

## Implementation
- Added a Staff-only Analytics management controller with six bounded read operations.
- Added forward-only migration `0062_analytics_http_rbac.sql` with the additive `analytics.view` permission.
- Preserved the frozen `analytics.export.create`, `analytics.export.view` and `analytics.export.download` separation.
- Export creation requires Step-Up and canonical idempotency and passes the request idempotency key into the A12 actor-bound job boundary.
- Every download requires its dedicated permission and Step-Up.
- Download responses preserve artifact bytes and allow-list `Content-Disposition`, `X-Content-Type-Options: nosniff` and `Cache-Control: no-store, private` behavior.
- Added exact OpenAPI 3.1 contracts for ten operations over nine paths, including query bounds, request schemas, RBAC metadata, Step-Up, idempotency and download headers.
- Updated the historical A2 regression assertion to retain the A2 application/read boundary while recognizing the later A13-only HTTP registration; no test was removed or skipped.

## Authority and security invariants
- All routes are Staff-only and permission guarded.
- Read endpoints delegate to the existing bounded services; the controller performs no calculation or owner-domain query.
- Export metadata and content remain scoped to the requesting actor by the A12 repository/service boundary.
- Artifact content is never added to central audit data.
- No new projection, XLSX, public/signed link, external delivery, retention deletion or business-rule change is introduced.

## GitHub evidence
- Implementation PR: `#111` — MERGED
- Implementation head: `5c87ead3ca8a0090568733908288ef3072ae776e`
- Merge commit: `4b178f7c634d78018f14e4abd4a538ca0cef4264`
- Canonical CI run: `32735001412` — PASS
- Verify job: `97455603515` — PASS

## Verification
- A13 dedicated tests: **8/8 PASS**
- Runtime tests: **557 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- TypeScript build: PASS
- OpenAPI: PASS — 531 paths / 601 operations / 1179 refs
- Architecture: PASS — 467 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- `git diff --check`: PASS

## Next
Proceed to Step 51 / A14 — Security / E2E / Regression Gate. A14 is verification-only: it must exercise the complete Step-51 boundary, including denial paths, actor isolation, Step-Up/idempotency agreement, download headers, migration lineage and full canonical regression, without adding product scope.
