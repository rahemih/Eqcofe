# EQCOFE Multi-Agent — Item 10 V1 Production Gate

## Canonical binding

- Mission: `EQCOFE Multi-Agent V1.5`
- Mission state: `CANONICAL / FROZEN`
- Mission SHA-256: `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1`
- Item 10 B1 canonical merge: `b33cc615fa46b22b931766905ec13f726d2dbe62`
- B1 protected merge run: `35497207994`
- B1 post-merge verify job: `106042329138`
- Task: `MA-ITEM10-PRODUCTION-GATE-001`
- Stage: `B2 → B5 active; B6 terminal closure pending protected merge + exact-SHA post-merge`

## B2 — Task Contract

The Item 10 Task Contract was created as the **first branch commit**:

`025f3b0c2aa2ebb73dd91701f3009da8d3fae5b1`

No executable Item 10 implementation change predates that contract on this branch.

The generated Task Catalog now indexes **40** contracts and remains subject to canonical `docs-automation --check`.

## B3 — Deterministic risk

Declared/effective Item 10 risk is:

```text
HIGH
```

Reason: Item 10 is the V1 Production Gate. A false PASS could incorrectly certify release trust, protection, evidence provenance, authority separation, security, Human Gate or fail-closed behavior.

Required HIGH gates:

- Primary Review
- Verification
- Security
- ACTIVE Lock
- Human Gate / verified Project Owner
- Merge Policy
- Protected workflow transport
- Exact-SHA post-merge canonical verification
- Exact-SHA post-merge Phase A verification

Risk downgrade is prohibited.

## B4 — Minimum Coverage Evidence Matrix

| # | Mission V1.5 domain | Deterministic evidence |
|---:|---|---|
| 1 | Architecture | `pnpm arch:check`, canonical architecture document, Item 10 static verifier |
| 2 | Workflow lifecycle | Workflow Controller plus lifecycle guard tests |
| 3 | Full State Machine | Item 10 exhaustive state-pair matrix across every canonical state plus special transition guards |
| 4 | Scope | Scope validation, forbidden precedence and commit-history enforcement |
| 5 | Lock | Scope/Lock Controller conflict, owner, overlap and terminal-release verification |
| 6 | Risk | Deterministic risk classifier, maximum-risk rule and anti-downgrade verification |
| 7 | Artifact binding | Exact-byte Artifact Hash Generator and mutation invalidation |
| 8 | Evidence provenance | Exact task/hash binding, stale evidence rejection and unauthorized commenter rejection |
| 9 | Authority separation | Reviewer/QA read-only lock authority, deterministic verification policy and trusted Owner Human authority |
| 10 | CI | Canonical CI + Phase A required verification, frozen install, NOT_EXECUTED never treated as PASS |
| 11 | Security | HIGH policy requires Security PASS |
| 12 | Human Gate | HIGH requires exact-artifact Project Owner approval before merge eligibility |
| 13 | Merge Policy | Merge Policy Controller and required `merge-policy` status |
| 14 | Branch Protection | Live ruleset revalidation by Merge Policy Controller plus protection-negative tests |
| 15 | Bypass actors | Live zero-bypass requirement and synthetic bypass rejection |
| 16 | Trusted integration identity | GitHub Actions integration ID `15368` required for `verify`, `phase-a`, `merge-policy` |
| 17 | Token governance | Canonical token telemetry integrity and calibration evidence |
| 18 | Docs automation | Task Catalog generator/check and stale-byte fail-closed behavior |
| 19 | Post-Merge | Exact merge-SHA checkout, read-only verification, `pnpm verify` + Phase A, no auto rollback |
| 20 | Fail-Closed behavior | Undefined state, scope, lock, risk, evidence, integration, protection and gate failures remain blocking |

### Full State Machine strengthening

Item 10 adds a dedicated exhaustive verifier:

- canonical state set equality;
- every `from × to` pair checked against the frozen transition map;
- Human Gate bypass rejected;
- unjustified Human escalation rejected;
- rejection categories/routes verified;
- artifact-change approval invalidation verified;
- Merge Ready revalidation route verified;
- terminal state immutability verified.

This closes the gap where older tests exercised representative transitions but did not independently assert every canonical state pair.

## B5 — Token Calibration Boundary

```text
Token Governance = VERIFIED
Quantitative Calibration = DEFERRED_TO_V1_1
```

Prohibited:

- synthetic telemetry;
- invented telemetry;
- estimated calibrated budgets;
- treating missing telemetry as zero usage.

Item 10 does not alter any existing calibrated or non-calibrated budget.

## Pre-merge state

The Item 10 executable verifier intentionally reports:

```text
PRE_MERGE_VERIFICATION_PASS
item10_terminal_complete = false
B6 = PENDING_PROTECTED_MERGE_AND_EXACT_SHA_POSTMERGE
```

This is deliberate. Item 10 is **not** allowed to self-declare canonical completion before protected transport and exact-SHA post-merge evidence exists.

## B6 — Terminal exit

Item 10 may be declared:

```text
ITEM_10 = CANONICAL_COMPLETE
```

only after all of the following are true for the final artifact:

- Task Contract = SATISFIED
- Risk = VALID / HIGH
- Scope = PASS
- Lock = VALID
- Primary Review = PASS
- Verification = PASS
- CI = PASS
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
