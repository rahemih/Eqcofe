# EQCOFE Multi-Agent — Item 10 V1 Production Gate Evidence Packet

## Identity

- Task ID: `MA-ITEM10-PRODUCTION-GATE-001`
- Mission Version: `V1.5`
- Mission Hash: `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1`
- Canonical Base: `b4c8f01715e0f1367fa6d96db2c4262c02a0b205`
- Stage: `B`
- B1: `CANONICAL_COMPLETE`
- B2: `RESTART_CONTRACT_CONSTRUCTED / PENDING_EXACT_HEAD_VERIFICATION`
- B3: `NOT_YET_RECONFIRMED_AFTER_REMEDIATION`
- B4: `NOT_YET_REVERIFIED_AFTER_REMEDIATION`
- B5: `BOUNDARY_PRESERVED / NOT_YET_CLOSED`
- B6: `NOT_STARTED`
- Item 10: `NOT_CANONICAL_COMPLETE`

## B2 — Canonical Schema Discovery

Canonical Task Contract schema in active use: `2.2`.

Canonical supporting controllers discovered on `main`:

- `scripts/multi-agent/docs-automation.mjs`
- `scripts/multi-agent/scope-lock-controller.mjs`
- `scripts/multi-agent/scope-validation.mjs`
- `scripts/multi-agent/risk-verification-policy.mjs`
- `scripts/multi-agent/workflow-controller.mjs`
- `scripts/multi-agent/artifact-hash-generator.mjs`
- `scripts/multi-agent/merge-policy-controller.mjs`

Canonical generated catalog:
`docs/14-multi-agent/generated/TASK-CATALOG.md`

## B2 — Scope decision

Item 10 is a **verification-only production gate**.

The task may write only:

1. `docs/14-multi-agent/ITEM10-V1-PRODUCTION-GATE.md`
2. `docs/14-multi-agent/GOVERNANCE-LOG.md`
3. `docs/14-multi-agent/tasks/MA-ITEM10-PRODUCTION-GATE-001.json`
4. `docs/14-multi-agent/generated/TASK-CATALOG.md`

Runtime/controller/workflow/test/product changes are explicitly forbidden in this task.

If B3/B4/B5 discovers a defect or missing implementation:

```text
ITEM10 = BLOCKED
ROOT_CAUSE = RECORDED
REMEDIATION = SEPARATE_GOVERNED_TASK
ITEM10 = RESTART_FROM_CANONICAL_REMEDIATED_BASE
```

No in-gate repair is allowed.

## B2 — Deterministic risk preview

Canonical Project Map defines HIGH sensitive zones for:

- `src/modules/payment/**`
- `src/modules/auth/**`

The Item 10 write scope does not match those zones, so sensitive-zone floor = `LOW`.

The Task Contract declares deterministic rule:

`ITEM10_PRODUCTION_GATE_HIGH`

matching all four Item 10 governance write paths.

Therefore classifier inputs are:

```text
Sensitive-zone floor:       LOW
Task-detected risk:         HIGH
Manager risk:               HIGH
Deterministic minimum:      HIGH
Effective risk:             HIGH
Rejected downgrade:         false
Human Gate Required:        true
```

B3 must independently confirm this result from the actual final PR paths. If the path set changes, B3 classification must be recomputed.

## B2 — 20 mandatory coverage Acceptance Criteria

| # | Coverage domain | AC | Deterministic verification |
| ---: | --- | --- | --- |
| 1 | Architecture integrity | `AC-001` | `architecture_integrity_verification` |
| 2 | Workflow lifecycle | `AC-002` | `workflow_lifecycle_verification` |
| 3 | Full State Machine | `AC-003` | `full_state_machine_verification` |
| 4 | Scope enforcement | `AC-004` | `scope_enforcement_verification` |
| 5 | Lock acquisition/conflict/release | `AC-005` | `lock_lifecycle_verification` |
| 6 | Risk classification (deterministic) | `AC-006` | `deterministic_risk_verification` |
| 7 | Artifact binding | `AC-007` | `artifact_binding_verification` |
| 8 | Evidence provenance (P1-P4) | `AC-008` | `evidence_provenance_p1_p4_verification` |
| 9 | Authority separation | `AC-009` | `authority_separation_verification` |
| 10 | CI enforcement | `AC-010` | `ci_enforcement_verification` |
| 11 | Security Gate enforcement | `AC-011` | `security_gate_verification` |
| 12 | Human Gate enforcement | `AC-012` | `human_gate_verification` |
| 13 | Merge Policy enforcement | `AC-013` | `merge_policy_verification` |
| 14 | Branch Protection validation | `AC-014` | `branch_protection_verification` |
| 15 | Bypass actors verification | `AC-015` | `bypass_actor_verification` |
| 16 | Trusted integration identity | `AC-016` | `trusted_integration_verification` |
| 17 | Token governance | `AC-017` | `token_governance_verification` |
| 18 | Docs automation | `AC-018` | `docs_automation_verification` |
| 19 | Post-Merge verification | `AC-019` | `postmerge_exact_sha_verification` |
| 20 | Fail-Closed behavior | `AC-020` | `fail_closed_verification` |

All twenty are mandatory. `NOT_EXECUTED`, unresolved `SKIP`, stale evidence, narrative-only claims or untrusted evidence cannot satisfy an AC.

## B2 — Evidence minimum fields

Canonical Mission V1.5 Section 12 contains **15 named minimum fields**, not 22:

1. Task ID
2. Mission Version
3. Mission Hash
4. PR Number
5. Base SHA
6. Head SHA
7. Artifact Hash
8. Gate Type
9. Raw Result
10. Normalized Result
11. Actor / Authority
12. Transport Identity
13. Timestamp
14. Workflow Run ID
15. Evidence / Comment / Check ID

The Advisor handoff states "22 fields", but the canonical frozen Mission names 15 fields. Per Source-of-Truth order, the 15 named Mission fields govern. No seven unnamed fields are invented.

Timestamp:
`YYYY-MM-DDTHH:MM:SSZ` only.

Raw provider result must be preserved and normalized result recorded separately.

## B2 — Provenance

Required machine-verifiable capabilities:

- P1 — distinguish Executor Evidence from Deterministic Review Evidence.
- P2 — bind evidence to exact Artifact Hash.
- P3 — reject Self-Review substitution.
- P4 — reject Self-Verification substitution.

## B2 — Token boundary

```text
Token Governance = VERIFIED_REQUIRED
Quantitative Calibration = DEFERRED_TO_V1_1
Synthetic telemetry = PROHIBITED
Invented telemetry = PROHIBITED
Estimated calibrated budget = PROHIBITED
Fake zero-usage inference = PROHIBITED
```

No numeric calibrated Item 10 token budget is claimed by this Task Contract.

## Catalog generation note

The connected GitHub execution surface does not expose a repository shell or a dedicated generator workflow. No claim is made that the generator was executed locally by the Executor.

The catalog bytes are constructed from the canonical `docs-automation.mjs` rendering algorithm and **must** pass canonical CI generator/check verification before B2 may be reported as verified.

If CI reports `TASK_CATALOG_STALE`, B2 fails closed.

## B2 completion rule

B2 may be reported ready for Advisor review only when:

- Task Contract exists at the canonical path;
- exactly 20 B4 domains have explicit mandatory ACs;
- Scope/Lock definition is explicit;
- deterministic HIGH risk preview is recorded;
- evidence requirements match canonical Mission Section 12;
- Task Catalog contains the task and expected count;
- PR is created from exact base;
- exact-head CI/Phase A status is recorded;
- artifact hash and lock evidence are recorded.

B2 completion does **not** make Item 10 canonical and does not authorize a merge by itself.

## Next

After Advisor B2 review:

```text
B3 = DETERMINISTIC RISK CONFIRMATION
B4 = 20-DOMAIN COVERAGE VERIFICATION
B5 = TOKEN CALIBRATION BOUNDARY VERIFICATION
B6 = ITEM 10 CANONICAL CLOSURE
```


## Restart after canonical remediation

Item 10 attempt PR #214 was correctly aborted after B4 discovered:
`PROVENANCE_CAPABILITY_INCOMPLETE_P1_P3`.

Canonical remediation:
- PR #216
- Task: `MA-ITEM10-PROVENANCE-SEPARATION-001`
- remediation merge SHA: `b4c8f01715e0f1367fa6d96db2c4262c02a0b205`
- protected merge run: `35500317788`
- postmerge verify job: `106050868593`
- provenance finding: `REMEDIATED_CANONICALLY`

Restart rules:
- PR #214 terminal Item 10 evidence is not reused.
- B2/B3/B4/B5/B6 are re-evaluated from the remediated canonical base.
- Primary Review is now provider-bound to exact-head `verify + phase-a` GitHub Actions facts from integration `15368`.
- Executor/comment REVIEW evidence is unauthorized.
- Executor/comment VERIFICATION evidence is unauthorized.
- Security/Human/Lock remain exact-artifact gates.
- Human approval cannot substitute for Review, Verification or Security.

Current restart lock ID:
`LOCK-MA-ITEM10-PRODUCTION-GATE-001-R2-01`

## Generator execution finding

The canonical docs generator exists, but the connected Executor surface still does not expose a repository shell or dedicated generator dispatch.

This remains a recorded operational finding only:
`GENERATOR_EXECUTION_SURFACE_UNAVAILABLE_TO_EXECUTOR`

No claim of local generator execution is made. Catalog correctness must remain machine-verified by canonical CI/checks and fail closed on any stale/generated-file mismatch.
