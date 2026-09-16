# EQCOFE Multi-Agent Process Improvement Backlog

This backlog records governance/process improvements discovered during implementation. Entries are not considered canonical until the implementing task is merged and its required post-merge verification succeeds.

## Active Items

| ID | Improvement | Source | Priority | Status | Required Before |
| --- | --- | --- | --- | --- | --- |
| P-1 | Enforce declared write-scope validation before each authorized agent mutation/commit and reject unauthorized committed history before canonical merge. | `MA-POSTMERGE-DRIFT-001`, `MA-SCOPE-SLIP-POSTITEM6-001`, `MA-POSTMERGE-VERIFY-SUPPRESSED-001` | High | ITEM 7 IMPLEMENTED ON BRANCH / CANONICAL PROOF PENDING | Item 7 closure |
| P-2 | Add a deterministic scope validation check to the required pre-merge workflow so out-of-scope mutations fail closed. | `MA-POSTMERGE-DRIFT-001` | High | CLOSED — PR #166 / Item 6 | First production pilot merge |
| P-3 | Publish a CI-stuck workaround playbook containing only scope-safe recovery methods and explicitly forbidding out-of-scope file edits. | `MA-POSTMERGE-DRIFT-001`, repeated scope-slip pattern | Medium | ITEM 7 IMPLEMENTED ON BRANCH / CANONICAL PROOF PENDING | Item 7 closure |
| P-4 | Execute a dedicated Pre-Pilot Verification Gate covering deterministic unit/regression, cross-controller integration, LOW/HIGH dry runs, and negative fail-closed scenarios before any real Pilot task. | Project Owner directive after Item 6 closure | High | REGISTERED / NOT EXECUTED | First Item 8 Pilot task |

## P-1 — Per-Mutation / Per-Commit Scope Enforcement

### Goal

Every repository mutation associated with a task must be checked against the active Task Contract write scope before it becomes accepted canonical history. Final-diff validation remains mandatory but is not sufficient by itself to detect transient out-of-scope commits that are later reverted.

### Minimum acceptance

- The active Task Contract is resolved before an authorized agent repository write.
- The intended path is normalized and checked against declared `scope.write` and `scope.forbidden` before mutation.
- Forbidden patterns always win over allowed write patterns.
- Exact changed paths for every branch-only commit are independently rechecked in required PR CI.
- CI validates source and destination paths for rename/copy operations.
- Documentation-only, CI-retrigger, marker, and semantically trivial changes are not exempt.
- Artifact-bound Review, Security, Human Gate, and Lock evidence becomes stale after artifact mutation according to the existing Merge Policy.
- Regression coverage includes an unauthorized temporary file followed by a reverting commit, a rename crossing scope, and a forbidden path that also matches broad allowed scope.

### Repeated-scope-slip escalation — mandatory Item 7 hardening

By the post-Item6 / PR #173 remediation period, the program had accumulated five operational incidents, including three scope-slip/operator-mutation incidents. Independent review escalated scope discipline from a manual-process concern to mandatory Item 7 automation.

Item 7 implements a two-layer model: pre-change validation for authorized agent writes and a required-CI complete commit-history backstop. The control intentionally claims **merge prevention**, not physical impossibility of every out-of-band feature-branch push. P-1 becomes CLOSED only after the Item 7 exact artifact passes required CI, independent Review, canonical merge, and post-merge verification.

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

P-2 does not replace P-1: P-2 validates the final PR artifact, while P-1 adds authorized pre-change validation plus complete branch-history detection for transient committed violations.

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

Item 7 publishes the detailed operational form of this playbook in `docs/14-multi-agent/SCOPE-DISCIPLINE.md`. P-3 becomes CLOSED only after Item 7 is canonical and post-merge verification passes.

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

## Item 7 implementation note

Item 7 also adds provider-neutral Token Telemetry and deterministic Docs Automation. Docs generation owns only `docs/14-multi-agent/generated/TASK-CATALOG.md`; incident history and frozen governance documentation remain manually controlled. The existing `multi-agent:test` wildcard is intentionally reused, so Item 7 does not modify `package.json` or required workflow files.
