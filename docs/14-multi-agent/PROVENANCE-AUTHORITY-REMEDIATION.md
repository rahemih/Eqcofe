# EQCOFE Multi-Agent — Provenance / Authority Separation Remediation

## Trigger

Mission V1.5 Item 10 B4 detected a blocking trust-boundary finding on PR #214:

`PROVENANCE_CAPABILITY_INCOMPLETE_P1_P3`

Source evidence:
- Item 10 PR: `#214`
- finding comment: `5748513958`
- aborted Item 10 artifact: `6a56c77b69563720b7d89988210bc7b4b0649c9465c98671b628a0d7b047094d`

Item 10 remains blocked and must restart after this remediation becomes canonical.

## Root cause

The canonical Merge Policy trusted PR gate comments by repository-owner login. That authenticated transport, but it did not distinguish Executor-authored REVIEW evidence from Primary Review authority.

Consequences:

- P1 was incomplete: Executor evidence and deterministic review evidence were not machine-distinguished.
- P3 was incomplete: Executor Self-Review substitution could satisfy the REVIEW comment gate.
- P4 already relied on trusted GitHub Actions integration filtering for required CI, but unauthorized same-name check evidence was not explicitly classified.

## Remediation

### Primary Review

Canonical Primary Review is moved to a provider-bound check run:

```text
check name: deterministic-review
transport: GitHub Actions check run
required integration id: 15368
exact head: current PR head
artifact binding: current deterministic artifact hash
```

PR REVIEW comments are never authoritative after this remediation. Any such comment is classified as:

`UNAUTHORIZED_REVIEW_EVIDENCE`

The deterministic-review job validates, before merge-policy:

- canonical Task Contract authority;
- exact PR trust boundary;
- exact changed-path scope;
- deterministic risk and floor;
- Human Gate requirement consistency;
- project-map/head binding;
- exact artifact hash computation.

### Verification

Required CI evidence remains provider-bound to GitHub Actions integration `15368`.

A same-name check from another integration is not PASS and is explicitly classified as:

`UNAUTHORIZED_VERIFICATION_EVIDENCE`

### Workflow ordering

For pull requests:

```text
deterministic-review
        ↓
merge-policy
```

The merge-policy job uses `needs: deterministic-review` and still runs fail-closed after a review failure so the provider evidence can be inspected.

The protected workflow_dispatch merge re-resolves the exact-head deterministic-review check and required CI checks before merge eligibility.

## Mission capability mapping

| Capability | Remediation proof |
| --- | --- |
| P1 | REVIEW comments rejected; provider check evidence separately resolved |
| P2 | Existing exact-artifact hash binding preserved |
| P3 | Self-Review comment cannot satisfy Primary Review |
| P4 | Wrong-integration verification evidence explicitly rejected |

## Non-goals

This task does not:
- restart Item 10 before remediation is canonical;
- mutate product/runtime/database/business logic;
- change Mission V1.5 bytes;
- weaken required checks or ruleset;
- change Human approval authority;
- claim Item 10 or V1 Operational Acceptance PASS.

## Restart rule

Only after protected merge and exact-SHA post-merge verification of this remediation:

1. restart Item 10 from new canonical `main`;
2. create a fresh Item 10 Task Contract bound to that new base;
3. re-run B3/B4/B5/B6;
4. do not reuse PR #214 terminal evidence.
