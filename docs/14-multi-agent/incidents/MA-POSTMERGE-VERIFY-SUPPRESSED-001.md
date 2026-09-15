# MA-POSTMERGE-VERIFY-SUPPRESSED-001

## Status

OPEN — REMEDIATION IN PROGRESS

## Summary

The first post-bootstrap canonical merge, PR #172, was merged correctly by the deterministic `Merge Policy Enforcement` workflow through `workflow_dispatch`. The merge executor revalidated all required gates and merged exact PR head `108b84481e11c76292e60213cf403688ef577517` as canonical merge commit `deb78949fc289ce5d530f99ed2f6da62a89785f5`.

After the merge, no `push`-triggered `Canonical CI` or `Phase A Verification` workflow run was created for the exact merge commit, even though both workflows are configured to run on pushes to `main`.

This means the merge itself is valid, but the established exact-canonical-main post-merge verification control was not executed. `NOT_EXECUTED` is not treated as `PASS`.

## Evidence

- Canonical merge workflow run: `34954608475` — SUCCESS.
- Merge job: `104333521662` — SUCCESS.
- Merge executor output: `status=MERGED`, PR `172`, SHA `deb78949fc289ce5d530f99ed2f6da62a89785f5`.
- PR #172: merged=true.
- `main` HEAD after merge: `deb78949fc289ce5d530f99ed2f6da62a89785f5`.
- Query for Actions runs on the exact merge SHA returned zero runs immediately after merge.
- PR #152 previously established that Phase A must execute on the exact canonical `main` head rather than reuse PR-head evidence.

## Root cause

CONFIRMED PLATFORM BEHAVIOR.

The deterministic merge job authenticates with the repository `GITHUB_TOKEN`. GitHub documents that, except for `workflow_dispatch` and `repository_dispatch`, events created by actions performed with `GITHUB_TOKEN` do not create new workflow runs. Therefore the merge-generated `push` event does not recursively trigger the configured push workflows.

This is not a Ruleset bypass and did not invalidate PR #172's pre-merge gates. It is a post-merge observability / verification regression introduced by the transition from manual bootstrap merge to the canonical GitHub-Actions merge executor.

## Impact

- PR #172 merged through the intended deterministic path.
- Exact-head pre-merge `merge-policy`, `verify`, and `phase-a` all passed.
- The merge commit tree equals the reviewed PR-head tree, but the historically required post-merge CI execution on exact canonical `main` did not occur.
- Future canonical merges would repeat this gap if no remediation is made.

## Immediate containment

- Do not treat missing post-merge workflows as PASS.
- Do not relax Ruleset required checks.
- Do not return to manual Owner merge or Bootstrap Exception.
- Hold PR #171 and Item 7 progression until a canonical remediation exists.

## Remediation

Task: `MA-POSTMERGE-VERIFY-001`.

The canonical merge workflow will perform post-merge verification directly inside the same `workflow_dispatch` run:

1. deterministic Merge Policy Controller performs the merge only after all pre-merge gates pass;
2. workflow resolves the exact merged PR `merge_commit_sha`;
3. exact 40-hex SHA is validated;
4. workflow checks out that exact merge SHA, not a moving `main` ref;
5. checkout binding is verified;
6. dependencies are installed;
7. full `pnpm verify` runs on that exact merge commit;
8. `node scripts/verify-phase-a.mjs` runs on the same exact merge commit with PostgreSQL available.

## Closure conditions

This incident can close only when:

- remediation PR is reviewed and merged through the canonical Merge Policy executor;
- no forbidden or unrelated path is changed;
- dedicated workflow-contract tests and full project CI pass;
- the next canonical merge exercises the remediated workflow and produces successful exact-SHA post-merge Canonical and Phase A verification inside the merge job;
- Reviewer confirms the evidence.

Until then the incident remains OPEN.
