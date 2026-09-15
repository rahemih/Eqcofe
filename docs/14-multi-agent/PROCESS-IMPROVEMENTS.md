# EQCOFE Multi-Agent Process Improvement Backlog

This backlog records governance/process improvements discovered during implementation. Entries are not considered implemented until a dedicated task, verification evidence, and required review gates are complete.

## Active Items

| ID | Improvement | Source | Priority | Status | Required Before |
| --- | --- | --- | --- | --- | --- |
| P-1 | Enforce declared write-scope validation on every commit, including trivial/documentation-only workaround commits. | `MA-POSTMERGE-DRIFT-001` | High | OPEN | V1 Production Gate |
| P-2 | Add a deterministic scope validation check to the required pre-merge workflow so out-of-scope mutations fail closed. | `MA-POSTMERGE-DRIFT-001` | High | IN PROGRESS — `MA-MERGE-POLICY-001` | First production pilot merge |
| P-3 | Publish a CI-stuck workaround playbook containing only scope-safe recovery methods and explicitly forbidding out-of-scope file edits. | `MA-POSTMERGE-DRIFT-001` | Medium | OPEN | First production pilot merge |

## P-1 — Per-Commit Scope Enforcement

### Goal

Every mutation associated with a task must be checked against the task contract write scope before it can be treated as eligible for review or merge.

### Minimum acceptance

- Exact changed paths are compared against declared write patterns.
- Forbidden patterns always win over allowed write patterns.
- A commit containing any unauthorized path fails closed.
- Documentation-only and semantically trivial changes are not exempt.
- Review/approval evidence is invalidated when a scope-changing commit changes the artifact.

## P-2 — Required Pre-Merge Scope Check

### Goal

Make scope validation a deterministic CI gate, not a manual convention.

### Minimum acceptance

- CI reads the active Task Contract.
- CI determines the PR's full changed-file set.
- CI produces PASS/FAIL evidence for exact PR head.
- FAIL blocks merge eligibility.
- The check cannot be skipped for LOW, MEDIUM, or HIGH tasks.

### Sequencing

P-2 depends on implementation of the Scope / Lock Controller and Verification Policy. Item 6 (`MA-MERGE-POLICY-001`) is the active implementation target that wires this check into the required `verify` job.

## P-3 — CI-Stuck Workaround Playbook

### Allowed patterns

Examples of scope-safe recovery methods, subject to repository capabilities and task policy:

- Re-run an existing failed workflow/job using the CI provider's rerun action.
- Push a legitimate in-scope correction when a correction is actually required.
- Close/reopen a PR only when this causes no artifact mutation and governance permits it.
- Use an empty commit only when produced by an approved local/Git workflow and when the task policy explicitly allows the metadata-only retrigger.

### Forbidden pattern

Never edit an unrelated or out-of-scope file merely to retrigger CI.

If no scope-safe rerun mechanism exists, the task remains blocked until a governance-approved recovery path is defined.
