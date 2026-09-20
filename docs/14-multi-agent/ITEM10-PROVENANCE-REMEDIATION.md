# EQCOFE Multi-Agent — Item 10 Provenance / Authority Separation Remediation

## Status

- Mission: `EQCOFE Multi-Agent V1.5`
- Mission state: `CANONICAL / FROZEN`
- Mission hash: `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1`
- Canonical remediation base: `b33cc615fa46b22b931766905ec13f726d2dbe62`
- Source Item 10 attempt: PR `#214`
- Source Item 10 artifact: `6a56c77b69563720b7d89988210bc7b4b0649c9465c98671b628a0d7b047094d`
- Source disposition: `BLOCKED / CLOSED_UNMERGED`
- Remediation task: `MA-ITEM10-PROVENANCE-SEPARATION-001`
- Risk: `HIGH`
- Human Gate: `REQUIRED`

## Root cause

Item 10 B4 found that canonical Merge Policy authenticated comment transport using the trusted repository-owner login but did not machine-verifiably distinguish:

```text
Implementation Authority
from
Primary Review Authority
```

Before remediation, an owner-authored `REVIEW=PASS` comment could satisfy the Review gate because the controller checked trusted author + exact artifact but did not prove independent deterministic Review authority.

This violated frozen Mission V1.5:

- P1 — distinguish Executor Evidence from Deterministic Review Evidence;
- P3 — reject Self-Review substitution;
- Authority invariant — `Executor Self-Review != Valid Review`;
- Test 6A-1 — Executor REVIEW PASS through real evidence transport must produce `UNAUTHORIZED_REVIEW_EVIDENCE`.

Item 10 therefore correctly failed closed.

## Remediation design

### Primary Review authority

Primary Review is no longer supplied by a user/Executor comment.

The Merge Policy Controller derives Primary Review only from provider facts for:

- `verify`
- `phase-a`

Requirements:

- exact PR head SHA;
- check run status = completed;
- check run conclusion = success;
- GitHub Actions integration id = `15368`;
- deterministic Review bound to exact Artifact Hash and head SHA.

`merge-policy` itself is deliberately not a source of Primary Review, preventing self-referential review.

### P1 — Executor vs Deterministic Review

```text
Executor comment evidence != Deterministic Review evidence
```

Deterministic Review has authority:

`CI_DETERMINISTIC`

and transport:

`GITHUB_ACTIONS_CHECK_RUNS`

built by the controller from GitHub provider facts.

### P2 — exact artifact binding

Deterministic Review stores and revalidates:

- exact Artifact Hash;
- exact head SHA;
- exact required check set;
- trusted integration id.

Existing artifact-bound Security, Human and Lock controls remain unchanged.

### P3 — Self-Review rejection

Any comment-carried `REVIEW` marker is classified:

```text
UNAUTHORIZED_REVIEW_EVIDENCE
```

It is never inserted into current gate evidence and actively blocks merge policy.

### P4 — Self-Verification rejection

Any comment-carried `VERIFICATION` marker is classified:

```text
UNAUTHORIZED_VERIFICATION_EVIDENCE
```

It cannot substitute for required provider verification.

Provider verification remains exact-head GitHub Actions facts.

### Human Approval separation

Human Approval remains a distinct owner-only gate.

A valid `HUMAN=APPROVED` record does not satisfy:

- Review;
- Verification;
- Security.

## Deterministic negative tests

The remediation adds coverage proving:

1. Executor REVIEW comment is rejected.
2. Executor VERIFICATION comment is rejected.
3. wrong integration check runs cannot become trusted provider facts.
4. wrong-head check runs cannot become trusted provider facts.
5. missing `phase-a` prevents deterministic Review PASS.
6. deterministic Review with wrong Artifact Hash blocks.
7. deterministic Review with wrong head blocks.
8. Human Approval cannot replace Review or Security.
9. existing stale/unauthorized/security/human/lock/protection controls remain enforced.

## Expected PR-mode behavior

A pull-request `merge-policy` run may initially fail closed while `verify` or `phase-a` are still pending.

After both exact-head provider checks PASS, rerunning the failed Merge Policy job may derive deterministic Primary Review PASS.

This is intentional and avoids a circular dependency:

```text
Primary Review sources = verify + phase-a
Primary Review source != merge-policy
```

## Canonical completion rule

This remediation is not canonical until:

- exact-head Canonical CI PASS;
- exact-head Phase A PASS;
- deterministic Primary Review PASS;
- SECURITY PASS;
- ACTIVE LOCK;
- HUMAN_PENDING;
- exact-artifact Owner approval;
- live protection PASS;
- Merge Policy PASS;
- protected workflow merge;
- exact-SHA post-merge `pnpm verify` PASS;
- exact-SHA post-merge Phase A PASS.

After terminal canonical completion, Item 10 must restart from the remediated `main` baseline. No evidence from closed PR #214 is reused.
