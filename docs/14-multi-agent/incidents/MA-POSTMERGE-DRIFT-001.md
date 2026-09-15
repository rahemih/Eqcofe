# MA-POSTMERGE-DRIFT-001 — PR #164 Post-Merge Governance Drift

**Status:** RESOLVED / ACCEPTED BY REVIEW 3A  
**Severity:** Governance / Scope & Artifact Binding  
**Affected PR:** #164  
**Discovered during:** Post-Merge Verification  
**Discovered by:** Executor  
**Canonical merge commit:** `36fa6122ff187841f85ccc777a0562be81ee16c8`

## Summary

After PR #164 had received Review 3 PASS for exact head `957b0fa2712bd58a4f4cd1f1e9875e0ed3b9a04a`, an additional commit changed `README.md` by adding two blank lines. The new PR head became `efd28ff01956f1cf5a1ca0408483c4eb3bcbf82c`.

`README.md` was outside the declared write scope for `MA-BOOTSTRAP-001`. Under the frozen artifact-binding model, the new commit also made the earlier Review 3 verdict stale because Review 3 was bound to the prior artifact.

The PR was subsequently merged. Post-merge verification discovered the drift and reported it instead of silently treating the earlier review as current.

## Root Cause

The independent Auditor suggested editing `README.md` as a workaround to retrigger CI after an empty-commit workaround did not produce the intended result. The Owner followed that workaround in good faith.

This root-cause statement is based on the Auditor's explicit Review 3A admission and is recorded without attributing fault to the Executor.

## Technical Impact

- Functional impact: **ZERO**.
- `README.md` change: two blank lines only.
- No source code, contract, migration, security rule, payment/pricing/inventory/auth logic, or product-design behavior changed.
- Final PR head before merge: `efd28ff01956f1cf5a1ca0408483c4eb3bcbf82c`.
- Final tested tree: `49dbd7d268f02b3a2cc01ba97b41d090b81f783a`.
- Merge commit: `36fa6122ff187841f85ccc777a0562be81ee16c8`.
- Merged tree equals tested tree: **YES**.

## Verification Evidence

For exact head `efd28ff01956f1cf5a1ca0408483c4eb3bcbf82c`:

- Canonical CI run `34829079478`: **SUCCESS**.
- Canonical CI job `verify`: **SUCCESS**.
- `pnpm verify`: **SUCCESS**.
- Phase A Verification run `34829079472`: **SUCCESS**.
- Phase A job `phase-a`: **SUCCESS**.
- `node scripts/verify-phase-a.mjs`: **SUCCESS**.

The merge commit uses the same tree SHA as the tested head.

## Governance Violations

1. **Write Scope Violation** — `README.md` was changed outside the `MA-BOOTSTRAP-001` write scope.
2. **Artifact Binding Stale** — Review 3 was issued for `957b0fa...`, while the final merged artifact came from `efd28ff...`.

Both violations are recorded even though the content change was semantically inert.

## Review 3A Resolution

The Auditor issued **Review 3A — PASS WITH GOVERNANCE NOTE** for:

- artifact: `efd28ff01956f1cf5a1ca0408483c4eb3bcbf82c`
- tree: `49dbd7d268f02b3a2cc01ba97b41d090b81f783a`
- merge commit: `36fa6122ff187841f85ccc777a0562be81ee16c8`

Review 3A accepted the merged result because:

1. functional impact is zero;
2. both required workflows passed on the new exact head;
3. the tested tree equals the merged tree;
4. the out-of-scope change was caused by an Auditor workaround suggestion;
5. rollback would create additional churn for a two-blank-line change.

**PR #164 canonical status after Review 3A: CLOSED / ACCEPTED.**

## Governance Lessons

### GL-1 — Workarounds must remain inside declared scope

A CI/workflow workaround MUST NOT mutate a file outside the task's declared write scope. If a workaround requires repository mutation, that mutation must already be permitted by the task contract or a new scoped task must be opened.

### GL-2 — Layer 2 Review is artifact-bound

Reviewer PASS is artifact-bound in the same operational sense as Human Approval. If the artifact changes after Review PASS, the previous verdict becomes stale and must be reissued for the new artifact before merge eligibility can be claimed.

### GL-3 — No precedent

Review 3A is a one-time post-merge acceptance for this incident. It does not authorize future write-scope violations. Future out-of-scope mutations are blocking and must be reverted or handled through a newly authorized task before merge.

## Process Improvements

The following improvements are registered in the Multi-Agent process backlog:

- **P-1:** Enforce scope validation on every commit, including trivial, empty-workaround, and documentation-only commits.
- **P-2:** Add a deterministic scope check to the required pre-merge workflow.
- **P-3:** Define a CI-stuck workaround playbook containing only scope-safe options and explicitly forbidding out-of-scope file edits.

## Closure

This incident is resolved by Review 3A with a governance note. No rollback is required. The lessons and process improvements remain mandatory follow-up work and do not create a bypass precedent.
