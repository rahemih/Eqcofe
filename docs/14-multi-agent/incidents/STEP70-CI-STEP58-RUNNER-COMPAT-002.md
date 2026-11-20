# Step70 CI Step58 storefront browser QA — clean-base runner compatibility successor

Status: **PROPOSED / NO MERGE**, successor task `EQCOFE-STEP70-CI-STEP58-RUNNER-COMPAT-002`, exact canonical base `97582ea1e85eaf6874dd40aabfaa712dbc7c128a`, risk MEDIUM.

## Failure and minimal repair
Provider [#44291906251](https://github.com/rahemih/Eqcofe/actions/runs/44291906251) failed while Playwright 1.55 installed Chromium dependencies on `ubuntu26.04-x64`; `ubuntu-latest` migrated to 26.04. This successor changes exactly **one runner line** in `.github/workflows/step58-storefront-quality.yml`: `ubuntu-latest` → `ubuntu-24.04`. All other workflow content is byte-for-byte unchanged; Chromium, axe-core@4.10.3, Playwright@1.55.0, storefront build and full browser QA preserved.

## Historical lineage and scope
- Old [PR #406](https://github.com/rahemih/Eqcofe/pull/406) had head `58c5f09ef132539ced0cc343654e84028ead2e46` and valid old-head CI. Its base predated the governance [PR #408](https://github.com/rahemih/Eqcofe/pull/408). Blindly merging it would replace the approved generated Task Catalog row for #408.
- The original MEDIUM Task `EQCOFE-STEP70-CI-STEP58-RUNNER-COMPAT-001` was formally closed **without merge**, terminal `ABORTED`, and original lock RELEASED, [evidence #7039450263](https://github.com/rahemih/Eqcofe/pull/406#issuecomment-7039450263). Its old artifact and all tests are **historical only**; neither task nor lock is recycled.
- This successor has a distinct `...-002` ID, distinct Task Contract and Lock, is based directly on `main@97582ea1e85eaf6874dd40aabfaa712dbc7c128a`, and regenerates the Task Catalog to keep the already-merged #408 contract and the successor ...-002 Task. It does NOT canonize old aborted ...-001 as a successful task.
- [GitHub Issue #405](https://github.com/rahemih/Eqcofe/issues/405) contains analysis and earlier failed runner evidence. Only Task Contract write-scope paths are changed.

## Acceptance and closure
Provider must independently run exact-head `browser-quality`, `verify`, Phase A, Prototype, required CodeQL, deterministic Review and Merge Policy; the new exact-head artifact must have a properly scoped `LOCK:ACTIVE` before protected dispatch. MEDIUM needs no Human Gate, but all checks and branch rules remain binding. No direct main merge, no inherited PR #406 status, no #404 security waiver, no Step71. Only after official protected merge, exact-SHA postmerge and terminal Lock RELEASED may this incident be marked complete.
