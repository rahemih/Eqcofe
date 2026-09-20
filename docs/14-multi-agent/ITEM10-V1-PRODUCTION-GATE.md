# EQCOFE Multi-Agent — Item 10 V1 Production Gate Evidence Packet

## Identity

- Task ID: `MA-ITEM10-PRODUCTION-GATE-001`
- Mission Version: `V1.5`
- Mission Hash: `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1`
- Canonical Base: `b4c8f01715e0f1367fa6d96db2c4262c02a0b205`
- Provenance remediation dependency: PR `#216` / merge `b4c8f01715e0f1367fa6d96db2c4262c02a0b205`
- Provenance remediation protected merge run: `35500317788`
- Provenance remediation post-merge verify job: `106050868593`
- Stage: `B`
- B1: `CANONICAL_COMPLETE`
- B2: `TASK_CONTRACT_ESTABLISHED`
- B3: `HIGH / HUMAN_GATE_REQUIRED`
- B4: `20_DOMAIN_EVIDENCE_PACKET_READY_FOR_EXACT_HEAD_VERIFICATION`
- B5: `TOKEN_GOVERNANCE_VERIFIED / QUANTITATIVE_CALIBRATION_DEFERRED_TO_V1_1`
- B6: `PENDING_PROTECTED_MERGE_AND_EXACT_SHA_POSTMERGE`
- Item 10: `IN_PROGRESS`
- Stage C: `BLOCKED`

## B2 — Task Contract

The Item 10 Task Contract is the first commit on the restart branch:

`6fa9676b1210843c2ceb3a7bb8492a69aa707c3e`

The gate remains **verification-only**. Runtime/controller/workflow/test/product implementation changes are forbidden by the Task Contract.

Any newly discovered implementation defect must:

```text
FAIL_CLOSED
REMEDIATE_IN_SEPARATE_GOVERNED_TASK
RESTART_ITEM10_FROM_REMEDIATED_CANONICAL_BASE
```

## B3 — Deterministic Risk

Expected deterministic result for the declared four-path Item 10 write scope:

```text
Effective Risk = HIGH
Human Gate Required = true
Risk Downgrade = PROHIBITED
```

The final exact-head Merge Policy result is authoritative and must independently confirm this preview.

## B4 — 20-domain evidence packet

| # | Domain | Canonical evidence / verification requirement | Pre-merge status |
|---:|---|---|---|
| 1 | Architecture | canonical architecture checks + full `pnpm verify` | READY_FOR_EXACT_HEAD |
| 2 | Workflow lifecycle | canonical Workflow Controller + lifecycle tests | READY_FOR_EXACT_HEAD |
| 3 | Full State Machine | canonical transition map; 20 states / 400 ordered pairs / 34 legal / 366 illegal; full valid lifecycle accepted | PASS_BASELINE |
| 4 | Scope | scope validation + history enforcement | READY_FOR_EXACT_HEAD |
| 5 | Lock | lock acquisition/conflict/owner/terminal-release tests | READY_FOR_EXACT_HEAD |
| 6 | Risk | deterministic classifier + HIGH task rule | READY_FOR_EXACT_HEAD |
| 7 | Artifact binding | exact-byte artifact hash + mutation invalidation | READY_FOR_EXACT_HEAD |
| 8 | Evidence provenance | P1-P4 remediation from canonical PR #216 | PASS_BASELINE |
| 9 | Authority separation | Primary Review provider-derived; REVIEW/VERIFICATION comments rejected | PASS_BASELINE |
| 10 | CI | exact-head Canonical CI + Phase A provider facts | PENDING_EXACT_HEAD |
| 11 | Security | exact-artifact SECURITY PASS required for HIGH | PENDING_EXACT_ARTIFACT |
| 12 | Human Gate | exact-artifact PROJECT_OWNER approval after HUMAN_PENDING | PENDING_HUMAN |
| 13 | Merge Policy | controller must produce blockers=[] and merge_eligible=true | PENDING_EXACT_ARTIFACT |
| 14 | Branch Protection | live ruleset `23278861` active + strict required checks | PASS_BASELINE |
| 15 | Bypass actors | live ruleset requires zero bypass actors | PASS_BASELINE |
| 16 | Trusted integration identity | required checks bound to GitHub Actions integration `15368` | PASS_BASELINE |
| 17 | Token governance | telemetry/governance integrity verified by canonical suite | READY_FOR_EXACT_HEAD |
| 18 | Docs automation | generated Task Catalog exactness required by canonical generator check | PENDING_EXACT_HEAD |
| 19 | Post-Merge | protected merge exact SHA + post-merge `pnpm verify` + Phase A | PENDING_POSTMERGE |
| 20 | Fail-Closed | state/scope/lock/risk/provenance/integration/protection/missing-gate failures must block | READY_FOR_EXACT_HEAD |

### Full State Machine deterministic baseline

Canonical source:
`scripts/multi-agent/workflow-controller.mjs`

Derived directly from the canonical transition map at the Item 10 base:

- states: **20**
- ordered state pairs: **400**
- legal transitions: **34**
- illegal transitions: **366**
- invalid transition accepted by the transition map: **0**
- complete valid lifecycle to `MERGED`: **PASS**
- terminal states: **MERGED, ABORTED**

Stage C Test 5D remains independently required; this Item 10 baseline does not replace Stage C acceptance.

### Provenance P1-P4 baseline

Canonical remediation PR #216 established:

```text
P1 = PASS — Executor Evidence != Deterministic Review Evidence
P2 = PASS — exact artifact/head binding retained
P3 = PASS — REVIEW comment => UNAUTHORIZED_REVIEW_EVIDENCE
P4 = PASS — VERIFICATION comment => UNAUTHORIZED_VERIFICATION_EVIDENCE
```

Primary Review source:

```text
verify + phase-a provider facts
GitHub Actions integration = 15368
exact head SHA
exact artifact binding
```

Human Approval remains separate and cannot substitute for Review or Security.

### Live branch-protection baseline

Ruleset:
`23278861`

- enforcement: `active`
- bypass actors: `0`
- strict required checks: `true`
- required checks: `merge-policy:15368, phase-a:15368, verify:15368`

Expected exact set:

```text
verify:15368
phase-a:15368
merge-policy:15368
```

Any drift before merge is blocking.

## B5 — Token Calibration Boundary

```text
Token Governance = VERIFIED_REQUIRED
Quantitative Calibration = DEFERRED_TO_V1_1
Synthetic telemetry = PROHIBITED
Invented telemetry = PROHIBITED
Estimated calibrated budget = PROHIBITED
Fake zero-usage inference = PROHIBITED
```

No quantitative calibration claim is introduced by Item 10.

## B6 — Terminal closure

This document deliberately does **not** declare terminal completion before protected transport.

Item 10 may become:

```text
ITEM_10 = CANONICAL_COMPLETE
```

only after the final artifact has all required evidence:

- Task Contract = SATISFIED
- Risk = VALID / HIGH
- Scope = PASS
- Lock = VALID
- Primary Review = PASS from provider facts
- Verification = PASS
- Canonical CI = PASS
- Security = PASS
- Human Gate = PASS
- Protection = PASS
- Merge Policy = PASS
- Protected Merge = PASS
- Exact-SHA Post-Merge Canonical Verify = PASS
- Exact-SHA Post-Merge Phase A = PASS

Until then:

```text
ITEM_10 = IN_PROGRESS
STAGE_C = BLOCKED
```
