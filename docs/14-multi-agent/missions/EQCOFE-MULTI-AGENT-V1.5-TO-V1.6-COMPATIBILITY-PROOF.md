# EQCOFE Multi-Agent Mission Compatibility Proof — V1.5 → V1.6

## Identity

From Mission Version:
`V1.5`

To Mission Version:
`V1.6`

Old Mission Hash:
`7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1`

New Mission Hash:
`b01ee3d1f02dc4b80d1780db26d2a5cc8163698fc2f6a5544bc8b707d425380e`

Canonical predecessor main SHA at discovery:
`e261ad3461b00e77b477280f45826a85e7725960`

Governance blocker:
- Issue #231 — Mission V1.5 Phase 3 closure self-reference blocker

## Changes

1. Preserve the canonical V1.5 Mission bytes unchanged and create V1.6 as a new governed Mission version.
2. Advance current-version references from V1.5 to V1.6.
3. Replace only Section 32 closure-record semantics with a non-self-referential two-part model:
   - pre-merge Static Closure Record stored in the repository;
   - post-merge Terminal Provider Seal carrying immutable GitHub provider facts.
4. Explicitly prohibit guessed/predicted Closure Head SHA, Merge SHA, post-merge run/job, final main SHA, or closure timestamp before those facts exist.
5. Keep Sections 27–29 Acceptance Test semantics, Sections 33–42 final trust requirements, controllers, workflows, product/runtime code, risk rules, and protection policy unchanged.

## Root Cause

V1.5 Section 32 required the Closure Record file for its own Closure PR to contain its final Head SHA, Merge SHA, Post-Merge Run, and Closure UTC Timestamp while also prohibiting direct modification after merge.

Those terminal facts either change when the file changes or do not exist until after merge, creating an unsatisfiable self-reference. Fabricating or guessing them would violate the Mission's Machine-Verifiable and Fake PASS rules.

## Impact Analysis

| Acceptance Test | Impact | Disposition |
| --- | --- | --- |
| Test 1 — LOW | UNAFFECTED | Reuse exact immutable V1.5 terminal provider evidence |
| Test 2 — MEDIUM | UNAFFECTED | Reuse exact immutable V1.5 terminal provider evidence |
| Test 3 — HIGH | UNAFFECTED | Reuse exact immutable V1.5 terminal provider evidence including Owner Human Gate |
| Test 4 — Lock | UNAFFECTED | Reuse exact immutable negative-test evidence |
| Test 5 — Fail-Closed | UNAFFECTED | Reuse exact immutable 5A/5B/5C/5D evidence |
| Test 6 — Authority Separation | UNAFFECTED | Reuse exact immutable rejection/provider evidence |
| Test 7 — Protection Drift | UNAFFECTED | Reuse exact immutable 4/4 drift evidence |

Phase impact:

- Phase 0: revalidate live under V1.6 before closure.
- Phase 1: reusable through this Compatibility Proof; no acceptance test semantics changed.
- Phase 2: reusable through this Compatibility Proof; no acceptance test semantics changed.
- Phase 3: AFFECTED and MUST be executed fresh under V1.6.
- Final Live Revalidation: MUST execute fresh under V1.6.

## Reusable Evidence

### Positive tests — VALID immutable provider facts

- Test 1 R2: PR #224, merge `9017e0f25e9571568ed9acf4ca3ca977ce9e78f0`, protected run `35509307012`, exact-SHA postmerge PASS.
- Test 2 R2: PR #226, merge `383d7ae9cc12ef9c05e1a70c211e2dacfd729ab7`, protected run `35510389353`, postmerge job `106077187191` PASS.
- Test 3 HIGH: PR #228, merge `e261ad3461b00e77b477280f45826a85e7725960`, Human Gate exact-artifact APPROVED, protected run `35512147348`, exact-SHA postmerge PASS.

### Negative/control tests — VALID immutable provider facts

- Test 4: PR #221 — `PASS / BLOCKED_AS_EXPECTED`.
- Test 5A: PR #222 — required verification failure observed; merge blocked.
- Test 5B: PR #223 — stale exact-artifact evidence detected after mutation; merge blocked.
- Test 5C R2: PR #229 — exact out-of-scope blocker; closed unmerged.
- Test 5D: PR #225 — 20 states / 400 pairs / 366 illegal rejected / valid lifecycle accepted.
- Test 6: PR #230 plus canonical provider tests — executor self-review/self-verification rejected; Human substitution rejected; NOT_EXECUTED not PASS.
- Test 7: PR #227 — required-check removal, unexpected bypass actor, force-push enablement, and integration mismatch all detected 4/4; live protection mutation 0.

### Phase audit evidence

- Phase 1 Exit Audit: PR #225 comment `5749717825`, supplemented by fresh Test 5C R2 PR #229.
- Phase 2 Exit Audit: PR #228 comment `5750005585`, supplemented by fresh Test 6 PR #230.

## Artifact compatibility

Artifact hashes unchanged for every reused Test 1–7 artifact:
`YES`

V1.6 Mission artifact equals V1.5 Mission artifact:
`NO`

No V1.5 artifact-bound Mission-amendment gate is reused for the V1.6 amendment itself.

## Deterministic Validation

Before V1.6 may become canonical:

- exact V1.5 predecessor hash must still equal `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1`;
- exact V1.6 Mission hash must equal `b01ee3d1f02dc4b80d1780db26d2a5cc8163698fc2f6a5544bc8b707d425380e`;
- V1.5 Mission file must be byte-preserved;
- changed Mission semantics must be limited to Section 32 plus current-version advancement;
- Task Catalog must be exact;
- effective risk must be HIGH;
- exact-head Canonical CI and Phase A must PASS;
- provider-derived deterministic Review must PASS;
- exact-artifact Security and Lock must PASS;
- Owner Human Gate must occur only at HUMAN_PENDING;
- post-Human TOCTOU and Merge Policy must PASS;
- protected merge and exact-SHA post-merge must PASS.

## Required Re-runs after V1.6 becomes canonical

- Phase 0 live sanity;
- Phase 3 residual-state check;
- Final Live Revalidation;
- Closure PR under the V1.6 two-part closure protocol;
- exact-SHA post-merge verification;
- Terminal Provider Seal.

Tests 1–7 are not re-run unless a later mutation changes their governing semantics, controllers, workflows, artifact bindings, or protection policy.

## Owner Amendment Sign-off

`PENDING_EXTERNAL_ARTIFACT_BOUND_HUMAN_GATE`

A valid sign-off must bind the exact V1.6 amendment Task ID, final Head SHA, final Artifact Hash, and verified Project Owner login.

## Supplementary Advisor Review

The V1.5 predecessor's Advisor audit remains historical context for unchanged sections.
For this V1.6 amendment, deterministic validation and Owner sign-off govern; supplementary Advisor review is optional and cannot replace required provider/gate evidence.

## Registry Entry

- `docs/14-multi-agent/missions/REGISTRY.md`
- `docs/14-multi-agent/missions/AMENDMENTS-REGISTRY.md`
