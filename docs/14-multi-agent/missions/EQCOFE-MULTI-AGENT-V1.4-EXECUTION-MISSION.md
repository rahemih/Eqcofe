# EQCOFE Multi-Agent V1.4 Execution Mission

## Mission identity

- Mission: EQCOFE Multi-Agent V1.4
- Version: V1.4
- Repository: rahemih/Eqcofe
- Canonical branch: main
- MISSION_SPEC_STATUS: FROZEN
- Owner: rahemih
- Implementation authority: Executor
- Primary review: CI + Deterministic
- Supplementary review: Advisor / Independent Reviewer (optional)
- Human Gate authority: Project Owner
- Direct/manual write or merge to main: PROHIBITED

This file is byte-frozen. Its SHA-256 is registered in
docs/14-multi-agent/missions/REGISTRY.md. Any byte change creates a different Mission
Hash and requires a separately governed amendment or a new mission version.

## 1. Objective

Advance the deterministic EQCOFE Multi-Agent program through:

1. Mission Registration + Freeze.
2. Trust Model Resolution.
3. Stage B - Item 10, V1 Production Gate.
4. Stage C - V1 Operational Acceptance.
5. Canonical closure.

No fake PASS is allowed. NOT_EXECUTED, SKIPPED, PENDING, stale evidence, missing
evidence, or evidence from an untrusted identity must never be represented as PASS.

## 2. Frozen execution order

1. Mission Registration + Freeze.
2. Trust Model Resolution.
3. Item 10 Spec Discovery.
4. Item 10 governed execution.
5. Phase 0 - Final Sanity.
6. Phase 1 - Core Acceptance.
7. Phase 2 - Advanced Trust.
8. Phase 3 - Canonical Closure.

Authorization is not execution. Every repository-mutating task requires its own governed
Task Contract, exact scope, deterministic risk classification, required verification,
artifact-bound evidence, protected merge, and exact-SHA post-merge verification.

## 3. Stage A baseline

Dependency cleanup is complete before this registration task:

- PR #205 - development dependencies - CANONICAL_COMPLETE.
- PR #204 - runtime patches - superseded by PR #207 - CANONICAL_COMPLETE.
- PR #206 - NestJS updates - superseded by PR #208 - CANONICAL_COMPLETE.

PR #208 terminal evidence:

- approved head: 7f651ff7c0485a659fe908fd21ab1a131e692a88
- approved artifact hash: 99d69f115ed39add1390bd160f4be913ea6f714a9195fedf3ce843d13a2d5534
- protected merge run: 35494084743
- merge SHA: d6ccf594acc3997c31d8c8ec4afd817249650a95
- post-merge verify job: 106033918616
- full regression: 913/913 PASS
- PostgreSQL integrity: PASS
- Steps 01-28 canonical verification: PASS

The single post-merge Multi-Agent skip is an intentionally pull_request-only live
history test. It remains SKIPPED and is not counted as PASS.

## 4. Trust Model Resolution

The following identities are resolved and frozen for V1.4 unless changed by a separate
canonical governed task.

### Required checks and integration

- required checks: verify, phase-a, merge-policy
- trusted integration: GitHub Actions
- integration ID: 15368

A matching check name with the wrong integration identity is not trusted.

### Ruleset

- ruleset ID: 23278861
- ruleset name: main
- target: refs/heads/main
- enforcement: active
- bypass actors: none
- strict required-status-check policy: required

### Gate evidence transport

Gate evidence uses EQCOFE_GATE_V1 records in PR issue comments. Trusted evidence must:

- be authored by trusted repository-owner GitHub login rahemih;
- identify the expected task ID;
- bind to the exact current artifact SHA-256;
- use the required gate and status.

Malformed, stale, untrusted, missing, or non-PASS required evidence fails closed.

### Human Gate transport

For HIGH-risk tasks, Project Owner approval is an artifact-bound HUMAN gate record
using the same trusted PR-comment transport. The author must match the Task Contract
authorized_human_approver.github_login.

Human approval does not replace deterministic Review, Security, Lock, required CI, or
protection validation.

### Merge workflow

Canonical merge transport:

- workflow: Merge Policy Enforcement
- workflow file: .github/workflows/merge-policy.yml
- trigger: workflow_dispatch
- input: pr_number
- decision engine: scripts/multi-agent/merge-policy-controller.mjs
- direct/manual merge: prohibited

After merge, the exact merge SHA must be checked out and both canonical verification and
Phase A verification must pass. Post-merge failure is an investigation state, not a
successful closure.

### Trust boundary

V1.4 does not claim cryptographic signatures for gate comments. Trusted evidence identity
is the authenticated GitHub author plus exact artifact binding, Task Contract authority,
the EQCOFE_GATE_V1 protocol, trusted GitHub Actions integration identity, and protected
main enforcement.

## 5. Stage B - Item 10, V1 Production Gate

### B1. Spec Discovery

Before implementation, search canonical sources including:

- docs/14-multi-agent/**
- docs/12-current-state/MASTER-ROADMAP.md
- docs/12-current-state/CURRENT-STATE.md
- other canonical documentation discovered from main

If an executable Item 10 specification exists, the Item 10 Task Contract must bind to it.

If no executable specification exists:

- ITEM10_SPEC = MISSING
- STAGE_B = BLOCKED
- Item 10 implementation is forbidden
- root cause must be investigated without guessing
- Owner must provide the canonical spec or explicitly authorize governed creation

The labels Item 10 and V1 Production Gate, or sequencing references to them, are not by
themselves an executable specification.

### B2. Task Contract

After a canonical Item 10 spec exists, create a canonical-schema Task Contract binding
the exact base SHA, read/write/forbidden scope, lock IDs, risk and risk floor, Human Gate
requirement, acceptance criteria, verification, dependencies, token budget, repair policy,
and trusted protection/gate identities.

### B3. Deterministic Risk Classification

Effective risk is the maximum of deterministic risk floor, task-detected risk, and
Manager-selected risk. A downgrade below the deterministic minimum is rejected.

### B4. Minimum Coverage

Item 10 requires 18 mandatory coverage items.

The exact list must come from the canonical Item 10 specification. Until that spec is
canonical, those 18 items must not be guessed, reconstructed from memory, or invented.

Any mandatory coverage item in FAIL, PENDING, NOT_EXECUTED, mandatory SKIPPED, or
otherwise unverified state blocks Item 10 closure.

### B5. Token Calibration Boundary

Current Item 9 evidence is insufficient for numeric V1 token recalibration.

DEFERRED_TO_V1_1 remains authoritative unless a separate canonical governed task changes
that state using sufficient real telemetry. Missing telemetry is not zero usage and is
not estimated.

### B6. Canonical Completion

Item 10 may become CANONICAL_COMPLETE only after:

- exact-head required CI PASS;
- deterministic Review PASS;
- ACTIVE artifact-bound Lock;
- Security and Human Gate PASS when required by effective risk;
- Merge Policy reports zero blockers and merge eligibility;
- protected workflow merge succeeds;
- exact-SHA post-merge canonical verification PASS;
- exact-SHA post-merge Phase A verification PASS;
- canonical closure evidence is stored.

## 6. Stage C - V1 Operational Acceptance

Stage C begins only after Item 10 is CANONICAL_COMPLETE.

### Phase 0 - Final Sanity

Reconfirm canonical main, protection, unresolved blockers/incidents, active locks, pending
Human Gates, stale evidence, post-merge failures, and exact Mission/Item 10 identity.

### Phase 1 - Core Acceptance

Execute canonical definitions for:

- Test 1 - LOW
- Test 2 - MEDIUM
- Test 4 - Lock
- Test 5 - Fail-Closed (5A, 5B, 5C, 5D)

A label is not an executable test definition.

### Phase 2 - Advanced Trust

Execute canonical definitions for:

- Test 3 - HIGH
- Test 6 - Authority
- Test 7 - Protection Drift

HIGH-risk acceptance preserves Security and Project Owner Human Gate requirements.

### Phase 3 - Canonical Closure

Produce an evidence matrix, canonical closure record, and final Owner report.

PRODUCTION_TRUSTED may be declared only when every mandatory acceptance requirement has
canonical deterministic evidence and no unresolved blocking state remains.

## 7. Roles

### Owner (rahemih)

- Human Gate authority.
- Final decision authority for blocked states requiring Owner action.
- User-side workflow_dispatch when Executor transport cannot initiate it.
- Final sign-off.

### Executor

- Governed implementation, Task Contracts, PRs, evidence collection, and reporting.
- No direct/manual main write or merge.

### CI + Deterministic

Primary review and verification authority for objective repository/governance gates.

### Advisor / Independent Reviewer

Supplementary independent review. It does not replace deterministic required evidence.

### Security Gate

Mandatory for HIGH effective risk.

## 8. Global fail-closed rules

- NOT_EXECUTED != PASS
- SKIPPED != PASS
- PENDING != PASS
- stale artifact evidence is invalid
- untrusted-author evidence is invalid
- required-check name with wrong integration identity is invalid
- artifact mutation invalidates artifact-bound evidence
- overlapping ACTIVE writer locks are forbidden
- direct/manual merge to main is forbidden
- failed exact-SHA post-merge verification blocks canonical completion
- missing executable specification blocks implementation
- missing evidence is never replaced with an estimate

## 9. Completion condition

Mission V1.4 completes only after:

1. this byte-frozen Mission is canonically registered;
2. Trust Model resolution remains verified;
3. Item 10 reaches canonical completion;
4. Stage C Phases 0-3 reach required canonical terminal states;
5. final closure evidence is protected-merged and exact-SHA post-merge verified;
6. final Owner sign-off is recorded where the closure contract requires it.

Until then:

MISSION_V1_4 = IN_EXECUTION
