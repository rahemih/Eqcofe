# EQCOFE Multi-Agent Process Improvement Backlog

This backlog records governance/process improvements discovered during implementation. Entries are not considered canonical until the implementing task is merged and its required post-merge verification succeeds.

## Active Items

| ID | Improvement | Source | Priority | Status | Required Before |
| --- | --- | --- | --- | --- | --- |
| P-1 | Enforce declared write-scope validation before each authorized agent mutation/commit and reject unauthorized committed history before canonical merge. | `MA-POSTMERGE-DRIFT-001`, `MA-SCOPE-SLIP-POSTITEM6-001`, `MA-POSTMERGE-VERIFY-SUPPRESSED-001` | High | CLOSED — PR #175 / Item 7 canonical + post-merge verified | Item 7 closure |
| P-2 | Add a deterministic scope validation check to the required pre-merge workflow so out-of-scope mutations fail closed. | `MA-POSTMERGE-DRIFT-001` | High | CLOSED — PR #166 / Item 6 | First production pilot merge |
| P-3 | Publish a CI-stuck workaround playbook containing only scope-safe recovery methods and explicitly forbidding out-of-scope file edits. | `MA-POSTMERGE-DRIFT-001`, repeated scope-slip pattern | Medium | CLOSED — PR #175 / Item 7 canonical + post-merge verified | Item 7 closure |
| P-4 | Execute a dedicated Pre-Pilot Verification Gate covering deterministic unit/regression, cross-controller integration, LOW/HIGH dry runs, and negative fail-closed scenarios before any real Pilot task. | Project Owner directive after Item 6 closure | High | CLOSED / PASS — PR #179 + exact-SHA post-merge verified; terminal closure synchronized by `MA-POST-PRE-PILOT-GOVERNANCE-001` | First Item 8 Pilot task |

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

Item 7 implements a two-layer model: pre-change validation for authorized agent writes and a required-CI complete commit-history backstop. The control intentionally claims **merge prevention**, not physical impossibility of every out-of-band feature-branch push.

`P-1` is **CLOSED**. PR `#175` passed exact-head required CI and independent Review, merged canonically at `584e2fce3fb41439b02e0481b439142f00c6099a`, and its exact-SHA post-merge verification job `104671401122` completed successfully in workflow_dispatch run `35057738409`.

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

Item 7 publishes the detailed operational form of this playbook in `docs/14-multi-agent/SCOPE-DISCIPLINE.md`.

`P-3` is **CLOSED**. PR `#175` merged canonically and its exact-SHA post-merge verification succeeded in run `35057738409`, satisfying the closure condition previously recorded for this process item.

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

### Canonical closure evidence

`P-4` is **CLOSED / PASS** by the following implementation evidence:

- implementation PR `#179`;
- reviewed exact head `fcb1204092a37bb8a592c514613566684521e578`;
- artifact hash `2bee1c5d86db54751f060eedcc6d37e28427f7186f431f98ef183b5bf6bfaecb`;
- final artifact-bound Lock comment `5692917879` — `ACTIVE`;
- independent Review/QA comment `5692969292` — `PASS`, with its stated access limitation preserved;
- pre-merge Canonical CI run `35062600585` — `SUCCESS`;
- pre-merge Phase A Verification run `35062600598` — `SUCCESS`;
- pre-merge Merge Policy run `35062600559`, attempt `3` — `SUCCESS`;
- pre-merge Multi-Agent `116/116 PASS`, `0 FAIL`, `0 SKIP`;
- pre-merge full project `906/906 PASS`, `0 FAIL`, `0 SKIP`;
- canonical workflow_dispatch run `35063369030` — `SUCCESS`;
- deterministic merge job `104688270430` — `SUCCESS`;
- canonical merge commit `a6789a506671b8ce5b081313f3e43f446f5b66cc`;
- exact-SHA post-merge verification job `104688332019` — `SUCCESS`;
- post-merge failure reporter `104688332314` — `SKIPPED` as expected;
- post-merge `pnpm verify` and Phase A — `PASS`;
- post-merge full project `906/906 PASS`, `0 FAIL`, `0 SKIP`;
- database verification `65 migrations / 65 checksums`, `0` unvalidated constraints, `0` invalid indexes;
- Phase A Steps `01–28` — `PASS`.

The sole post-merge Multi-Agent skip is the intentionally `pull_request`-only live scope-history test. It executed on the reviewed exact PR head before merge with `0 SKIP`, so its environment-gated non-PR execution is not treated as missing proof.

The original P-4 Task Contract, harness and tests remain reviewed historical artifacts. Terminal status is recorded in `docs/14-multi-agent/PRE-PILOT-CANONICAL-CLOSURE.md` and `MA-POST-PRE-PILOT-GOVERNANCE-001`.

After this closure synchronization itself completes protected canonical merge and exact-SHA post-merge verification, Item 8 is **AUTHORIZED / NOT STARTED**. Authorization does not execute a Pilot; Item 8 must start separately with the LOW pilot under its own Task Contract and governance gates.

## Item 7 canonical closure evidence

Item 7 is canonically closed by the following evidence:

- implementation PR `#175`;
- reviewed exact head `d311c5a2a338fb4bdb7d9d0ccb1ad60e60a68356`;
- artifact hash `c07ba5295b7b6f6ac11ddee981e206fb27278d4f2b35dfafbffdd1c15d8b6c6e`;
- canonical merge commit `584e2fce3fb41439b02e0481b439142f00c6099a`;
- workflow_dispatch merge/post-merge run `35057738409` — `SUCCESS`;
- exact-SHA post-merge verification job `104671401122` — `SUCCESS`;
- pre-merge Multi-Agent `108/108 PASS`, `0 SKIP`;
- pre-merge full project `906/906 PASS`, `0 SKIP`;
- post-merge canonical verification and Phase A — `PASS`.

The original Item 7 Task Contract remains the reviewed implementation artifact snapshot. Terminal status is recorded in `docs/14-multi-agent/ITEM7-CANONICAL-CLOSURE.md` and `MA-POST-ITEM7-GOVERNANCE-001`.

## Item 7 implementation note

Item 7 also adds provider-neutral Token Telemetry and deterministic Docs Automation. Docs generation owns only `docs/14-multi-agent/generated/TASK-CATALOG.md`; incident history and frozen governance documentation remain manually controlled. The existing `multi-agent:test` wildcard is intentionally reused, so Item 7 does not modify `package.json` or required workflow files.


## Item 9 canonical closure synchronization

Item 9 Stage A, B and C are already canonically merged and exact-SHA post-merge verified. Stage D is the separate governance/documentation closure task `MA-ITEM9-CALIBRATION-FINAL-CLOSURE-001`.

Canonical implementation evidence:

- Stage A: PR `#193`, merge `5db790c74f601c23819df943beffbff7f106f9d3`, protected run `35435491785`;
- Stage B: PR `#195`, merge `e79d7397d54545a8c3620961df4cc0df666ff9d5`, protected run `35437490690`;
- Stage C: PR `#196`, merge `00a1bd3498f4e044cabdbbabceb2dd57f2d5e3d2`, protected run `35438559717`;
- current Stage D baseline: `8f17364fc7c27dc30de5845c1af467b1215d1351`;
- Step 58-H / Step 58 final canonical closure: PR `#201`, protected run `35490799957`, merge `8f17364fc7c27dc30de5845c1af467b1215d1351`;
- canonical committed telemetry paths under `.eqcofe/telemetry/`: `0`.

Final calibration disposition remains evidence-limited:

- LOW / MEDIUM / HIGH primary samples: `0 / 10`;
- token-budget recommendation: `NO_NUMERIC_RECOMMENDATION`;
- retry/repair recommendation: `NO_NUMERIC_RECOMMENDATION`;
- risk/gates: `NO_CHANGE`;
- automatic policy mutation: forbidden.

The absence of telemetry is not interpreted as zero usage. Pilot budgets are not calibrated budgets.

Project Owner direction: quantitative Calibration V2 / recalibration is deferred to V1.1 until canonical evidence is sufficient. This does not weaken current V1 gates and does not permit estimated telemetry.

Item 9 terminal status and Item 10 authorization become canonical only after the Stage D synchronization itself completes protected merge and exact-SHA post-merge canonical + Phase A verification.

After that terminal closure:

- Item 9: `CANONICAL COMPLETE`;
- Item 10 — V1 Production Gate: `AUTHORIZED / NOT STARTED`;
- Item 10 must start separately under its own Task Contract and governance gates.
