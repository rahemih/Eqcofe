# EQCOFE Multi-Agent Process Improvement Backlog

This backlog records governance/process improvements discovered during implementation. Entries are not considered implemented until a dedicated task, verification evidence, and required review gates are complete.

## Active Items

| ID | Improvement | Source | Priority | Status | Required Before |
| --- | --- | --- | --- | --- | --- |
| P-1 | Enforce declared write-scope validation before each mutation/commit and reject unauthorized paths before they can enter active task branch history. | `MA-POSTMERGE-DRIFT-001`, `MA-SCOPE-SLIP-POSTITEM6-001`, `MA-POSTMERGE-VERIFY-SUPPRESSED-001` | High | MANDATORY ITEM 7 HARDENING / NOT IMPLEMENTED | Item 7 closure |
| P-2 | Add a deterministic scope validation check to the required pre-merge workflow so out-of-scope mutations fail closed. | `MA-POSTMERGE-DRIFT-001` | High | CLOSED — PR #166 / Item 6 | First production pilot merge |
| P-3 | Publish a CI-stuck workaround playbook containing only scope-safe recovery methods and explicitly forbidding out-of-scope file edits. | `MA-POSTMERGE-DRIFT-001`, repeated scope-slip pattern | Medium | OPEN / REQUIRED WITH ITEM 7 HARDENING | Item 7 closure |
| P-4 | Execute a dedicated Pre-Pilot Verification Gate covering deterministic unit/regression, cross-controller integration, LOW/HIGH dry runs, and negative fail-closed scenarios before any real Pilot task. | Project Owner directive after Item 6 closure | High | REGISTERED / NOT EXECUTED | First Item 8 Pilot task |

## P-1 — Per-Mutation / Per-Commit Scope Enforcement

### Goal

Every repository mutation associated with a task must be checked against the active Task Contract write scope before it can become accepted task history. Final-diff validation remains mandatory but is not sufficient by itself to prevent transient out-of-scope branch mutations.

### Minimum acceptance

- The active Task Contract is resolved before any repository write operation.
- The intended path is normalized and checked against declared `scope.write` and `scope.forbidden` before mutation.
- Forbidden patterns always win over allowed write patterns.
- An unauthorized path is rejected before a commit can be created or attached to the task branch.
- Exact changed paths for each produced commit are rechecked after commit creation; any mismatch fails closed and prevents further task progress.
- CI still validates the PR's complete changed-file set, including source and destination paths for rename operations.
- Documentation-only, CI-retrigger, marker, and semantically trivial changes are not exempt.
- Artifact-bound Review, Security, Human Gate, and Lock evidence becomes stale after any artifact mutation.
- The automation has deterministic tests for an unauthorized temporary file, a rename crossing scope, and a forbidden path that also matches a broad allowed glob.

### Repeated-scope-slip escalation — mandatory Item 7 hardening

By the post-Item6 / PR #173 remediation period, the program had accumulated five operational incidents, including three scope-slip/operator-mutation incidents. Independent review therefore escalated scope discipline from a manual-process concern to a mandatory automation requirement.

Item 7 (**Token Telemetry and Docs Automation**) MUST NOT close until P-1 is implemented and verified as an automated fail-closed control. This is a subtask/prerequisite inside the existing frozen Item 7; it does not create a new numbered implementation item and does not renumber Specification v3.1.

## P-2 — Required Pre-Merge Scope Check

### Goal

Make final PR scope validation a deterministic CI gate, not a manual convention.

### Minimum acceptance

- CI reads the active Task Contract.
- CI determines the PR's full changed-file set, including both source and destination paths for RENAME.
- CI produces PASS/FAIL evidence for exact PR head.
- FAIL blocks merge eligibility.
- The check cannot be skipped for LOW, MEDIUM, or HIGH tasks.

### Sequencing

P-2 depended on implementation of the Scope / Lock Controller and Verification Policy. Item 6 (`MA-MERGE-POLICY-001`) implemented the required pre-merge scope validation in the protected `merge-policy` check and became canonical in PR `#166` at merge commit `6df69308082698e6fbd0ae802b1e24fce3d3f866`. P-2 is therefore closed.

P-2 does not replace P-1: P-2 validates the final PR artifact, while P-1 prevents unauthorized transient branch mutations before they can become task history.

## P-3 — CI-Stuck Workaround Playbook

### Allowed patterns

Examples of scope-safe recovery methods, subject to repository capabilities and task policy:

- Re-run an existing failed workflow/job using the CI provider's rerun action.
- Push a legitimate in-scope correction when a correction is actually required.
- Close/reopen a PR only when this causes no artifact mutation and governance permits it.
- Use an empty commit only when produced by an approved local/Git workflow and when the task policy explicitly allows the metadata-only retrigger.

### Forbidden pattern

Never edit an unrelated or out-of-scope file merely to retrigger CI.

Never create a synthetic marker file, temporary workaround file, or unrelated documentation edit outside the Task Contract merely to produce a repository event.

If no scope-safe rerun mechanism exists, the task remains blocked until a governance-approved recovery path is defined.

## P-4 — Pre-Pilot Verification Gate

### Goal

Prove that the completed deterministic Multi-Agent infrastructure behaves correctly as an integrated system before the first real LLM-driven Pilot task is allowed to run.

### Sequencing rule

P-4 is a mandatory prerequisite for frozen implementation-order Item 8 (**Pilot tasks: LOW → MEDIUM → HIGH**). It does not renumber the frozen implementation order, does not replace Item 9 (**Calibration per risk class**), and does not start a Pilot itself.

### Minimum acceptance

- All deterministic controller/unit tests introduced through Items 1–7 pass together with the canonical repository regression suite.
- Cross-controller integration tests cover at minimum Lock ↔ Workflow, Risk ↔ Project Map, Artifact Binding ↔ Human Gate, and Merge Policy ↔ required upstream gates.
- A synthetic LOW task completes an end-to-end deterministic dry run without LLM execution or production mutation.
- A synthetic HIGH task completes an end-to-end deterministic dry run through exact-artifact Human Gate handling without production mutation.
- Negative tests prove fail-closed behavior for lock conflict, attempted risk downgrade, artifact mutation after approval, unauthorized evidence, external-head/fork PR, spoofed required-check identity, stale evidence, and protection drift.
- Required CI passes on the exact verification artifact and Reviewer/QA records no unresolved blocking finding.
- `FAIL`, `PENDING`, `NOT_EXECUTED`, or otherwise unverified mandatory checks prohibit the first Pilot.
