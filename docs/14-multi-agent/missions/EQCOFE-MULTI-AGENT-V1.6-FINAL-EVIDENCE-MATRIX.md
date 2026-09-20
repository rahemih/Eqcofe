# EQCOFE Multi-Agent V1.6 — Final Evidence Matrix

## Identity

- Mission Version: `V1.6`
- Mission Hash: `b01ee3d1f02dc4b80d1780db26d2a5cc8163698fc2f6a5544bc8b707d425380e`
- Compatibility Proof: `EQCOFE-MULTI-AGENT-V1.5-TO-V1.6-COMPATIBILITY-PROOF.md`
- Closure Task: `MA-V1-ACCEPTANCE-CLOSURE-V16-001`
- Closure PR: `#235`
- Evidence rule: immutable V1.5 provider evidence is reused only where the V1.5→V1.6 Compatibility Proof marks the acceptance semantics UNAFFECTED. Test 5C is replaced by a fresh V1.6 execution on PR #233.

## Section 33 Matrix

| Mission Version | Mission Hash | Task ID | Test Number | Risk | Risk Floor | Implementation Authority | Base SHA | Head SHA | Artifact Hash | Scope | Lock ID | PR Number | CI Run IDs | Primary Review Authority | Primary Review Evidence | Verification Authority | Verification Evidence | Transport Identity | Security Gate | Human Gate | Supplementary Reviewer | Merge Policy | Merge SHA | Post-Merge Run | Expected Negative Outcome | Actual Outcome | Terminal State | UTC Timestamp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-LOW-001 | Test 1 LOW R2 | LOW | LOW | AGENT-BUILD-A | 65d97e6343ade1b5d97e2e737f66a9b474fcd945 | 4ceef0bec368d70f245ef703ed843143f86a45e6 | d52e3abba237ce4fb72c3b848ea7e6003f89bff843164641ae340086bcc04752 | S1 | LOCK-MA-V1-ACC-LOW-001-R2-01 | 224 | CI 35508711916; Phase A 35508711923 | CI_DETERMINISTIC / GitHub Actions 15368 | Merge Policy PR run 35508711914 = PASS on exact head/artifact | GitHub Actions 15368 | verify PASS; phase-a PASS | PR events + protected workflow_dispatch 35509307012 | N/A | N/A | N/A | PASS; protected merge job 106074633510 | 9017e0f25e9571568ed9acf4ca3ca977ce9e78f0 | 35509307012 / job 106074674930 PASS | N/A | SUCCESS | MERGED / LOCK RELEASED | 2026-09-20T12:05:09Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-MEDIUM-001 | Test 2 MEDIUM R2 | MEDIUM | LOW | AGENT-BUILD-A | 9017e0f25e9571568ed9acf4ca3ca977ce9e78f0 | aec388362ecea8d9b767adacf729c0c9ddf5023e | 140a773618a52ea88d4b629d4c63a6f10037c2b3a73b8762131a4282bd4640e7 | S2 | LOCK-MA-V1-ACC-MEDIUM-001-R2-01 | 226 | CI 35510085787; Phase A 35510085744 | CI_DETERMINISTIC / GitHub Actions 15368 | Merge Policy PR run 35510085849 = PASS | GitHub Actions 15368 | verify PASS; phase-a PASS | PR events + protected workflow_dispatch 35510389353 | N/A | N/A | N/A | PASS; merge job 106077147659 | 383d7ae9cc12ef9c05e1a70c211e2dacfd729ab7 | 35510389353 / job 106077187191 PASS | N/A | SUCCESS | MERGED / LOCK RELEASED | 2026-09-20T12:25:12Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-HIGH-001 | Test 3 HIGH | HIGH | HIGH | AGENT-BUILD-B | 383d7ae9cc12ef9c05e1a70c211e2dacfd729ab7 | c93502a71f42a20ace901c833607e28d9f587127 | 207cb8d6d6d7415d6a7a9d8b476b061dc5f83deaa505d3a3f9e7b43b43e85ec9 | S3 | LOCK-MA-V1-ACC-HIGH-001-01 | 228 | CI 35511569865; Phase A 35511569846 | CI_DETERMINISTIC / GitHub Actions 15368 | Merge Policy PR run 35511569859 = PASS | GitHub Actions 15368 | verify PASS; phase-a PASS | PR events + protected workflow_dispatch 35512147348 | PASS; comments 5749902020 / 5749905562 | APPROVED by PROJECT_OWNER rahemih; comment 5749925813 | N/A | PASS after exact Human Gate; merge job 106081798451 | e261ad3461b00e77b477280f45826a85e7725960 | 35512147348 / job 106081838789 PASS | N/A | SUCCESS | MERGED / LOCK RELEASED | 2026-09-20T13:07:33Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-LOCK-001 | Test 4 Lock | LOW | LOW | AGENT-BUILD-B | 65d97e6343ade1b5d97e2e737f66a9b474fcd945 | 733178accc332c3e0145fb0decc90427701d11c8 | 3409ea80d1a7b1b62a452d54d14008bd565b46cc8f64ee529da34f406387df75 | S4 | LOCK-MA-V1-ACC-LOCK-001-01 | 221 | CI 35507860500; Phase A 35507860451 | CI_DETERMINISTIC / controller harness | Exact/prefix/nested/normalized/traversal/foreign-release conflicts rejected | GitHub Actions 15368 | verify PASS; phase-a PASS | TEST_ONLY PR events | N/A | N/A | N/A | Merge Policy 35507860445; merge remained ineligible | N/A | N/A | UNSAFE CONCURRENT WRITE PREVENTED | BLOCKED_AS_EXPECTED | CLOSED_UNMERGED / ABORTED / LOCK RELEASED | 2026-09-20T11:29:44Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-FAILCLOSED-5A-001 | Test 5A Broken Test | LOW | LOW | AGENT-BUILD-B | 65d97e6343ade1b5d97e2e737f66a9b474fcd945 | d587a99adf0d9ff5241ce1392f36b4b969784272 | 86cdcc5a1422ef860f86de8393d8805903d4021ec0a04c9dc8e5715de2f35ae5 | S5A | LOCK-MA-V1-ACC-FAILCLOSED-5A-001-01 | 222 | CI 35508055852 FAIL; Phase A 35508055834 FAIL | CI_DETERMINISTIC | NOT_EXECUTED as a passing review because required verification intentionally failed | GitHub Actions 15368 | Exact marker TEST_5A_INTENTIONAL_VERIFICATION_FAILURE observed | TEST_ONLY PR events | N/A | N/A | N/A | Protected merge blocked by required verify/phase-a FAIL; no dispatch | N/A | N/A | Verification FAIL; Merge BLOCKED | BLOCKED_AS_EXPECTED | CLOSED_UNMERGED / ABORTED / LOCK RELEASED | 2026-09-20T11:33:59Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-FAILCLOSED-5B-001 | Test 5B Artifact Mutation | LOW | LOW | AGENT-BUILD-B | 65d97e6343ade1b5d97e2e737f66a9b474fcd945 | 5922332ef53b42e6e0e18ab6315945062d7cb8a1 | 959acd145266eb8e5f6790c7fd4483cd3c7fa93dc5caac00727c4291951dea0e | S5B | LOCK-MA-V1-ACC-FAILCLOSED-5B-001-01 | 223 | CI 35508287286; Phase A 35508287282 | CI_DETERMINISTIC / GitHub Actions 15368 | Current provider checks PASS but pre-mutation gate binding became stale | GitHub Actions 15368 | verify PASS; phase-a PASS | TEST_ONLY PR events | N/A | N/A | N/A | Merge Policy 35508287284: stale_evidence=1; LOCK_EVIDENCE_MISSING; merge_eligible=false | N/A | N/A | STALE_APPROVAL_DETECTED; Merge BLOCKED | BLOCKED_AS_EXPECTED | CLOSED_UNMERGED / ABORTED / LOCK RELEASED | 2026-09-20T11:39:12Z |
| V1.6 | b01ee3d…380e | MA-V1-ACC-FAILCLOSED-5C-R2-V16-001 | Test 5C R2 Scope Violation — fresh V1.6 | LOW | LOW | AGENT-BUILD-A | 61dac96e99ff30282f137d7b76f1006918199683 | d10f302d666c5e61789e21953304311689c991c2 | 04d82ade7ef526df12522c04c73de367d97761cb69e67b767d27fa6c690ed621 | S5C | LOCK-MA-V1-ACC-FAILCLOSED-5C-R2-V16-001-01 | 233 | CI 35515688993 FAIL; Phase A 35515688981 FAIL | CI_DETERMINISTIC | Four dedicated 5C harness tests PASS; passing Review intentionally NOT_EXECUTED because required CI correctly failed | GitHub Actions 15368 | Exact SCOPE_HISTORY_VIOLATION on undeclared fixture | TEST_ONLY PR events | N/A | N/A | N/A | Run 35515689015 attempt 2 / job 106091222525: exact one SCOPE:OUT_OF_SCOPE blocker; merge_eligible=false | N/A | N/A | SCOPE_VIOLATION_DETECTED; WRITE_BLOCKED; MERGE_BLOCKED | BLOCKED_AS_EXPECTED | CLOSED_UNMERGED / ABORTED / LOCK RELEASED | 2026-09-20T14:13:11Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-FAILCLOSED-5D-001 | Test 5D Full State Machine | LOW | LOW | AGENT-BUILD-B | 9017e0f25e9571568ed9acf4ca3ca977ce9e78f0 | 4c93d24e4a5cc8aaad838b68a3ef7dfb35e20e9b | c1f01283afe673c8aa5a470d9b455a6b689f875d7cc037d9a8c534da6e843099 | S5D | LOCK-MA-V1-ACC-FAILCLOSED-5D-001-01 | 225 | CI 35509743145; Phase A 35509743135 | CI_DETERMINISTIC / canonical state-machine harness | 20 states; 400 ordered pairs; 34 allowed; 366 illegal; all illegal rejected; one full valid lifecycle accepted | GitHub Actions 15368 | verify PASS; phase-a PASS | TEST_ONLY PR events | N/A | N/A | N/A | Merge Policy 35509743123; test artifact remained unmerged | N/A | N/A | Every illegal transition REJECTED; valid lifecycle ACCEPTED | BLOCKED_AS_EXPECTED + VALID_LIFECYCLE_ACCEPTED | CLOSED_UNMERGED / ABORTED / LOCK RELEASED | 2026-09-20T12:10:37Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-AUTHORITY-SEPARATION-001 | Test 6 Authority Separation | MEDIUM | LOW | AGENT-BUILD-A | e261ad3461b00e77b477280f45826a85e7725960 | 6804fbc78ec391ce17fa7fe7b4eb2dc7ee3581f1 | adf145e5b2bcc5d4cbd74c3fc08372a0172eca0ea098883ca82200b1c44cf6a9 | S6 | LOCK-MA-V1-ACC-AUTHORITY-SEPARATION-001-01 | 230 | CI 35513113853; Phase A 35513113857 | CI_DETERMINISTIC / GitHub Actions 15368 | Valid provider review PASS; executor REVIEW/VERIFICATION attempts explicitly rejected | GitHub Actions 15368 | verify PASS; phase-a PASS | TEST_ONLY PR comments + GitHub Actions | N/A | N/A; Human substitution tests rejected | N/A | Run 35513113843 attempt 2 / job 106085264706: UNAUTHORIZED_REVIEW_EVIDENCE + UNAUTHORIZED_VERIFICATION_EVIDENCE; merge_eligible=false | N/A | N/A | Self-review/self-verification/Human misuse/NOT_EXECUTED acceptance all blocked | BLOCKED_AS_EXPECTED | CLOSED_UNMERGED / ABORTED / LOCK RELEASED | 2026-09-20T13:26:17Z |
| V1.6 via Compatibility Proof | b01ee3d…380e | MA-V1-ACC-PROTECTION-DRIFT-001 | Test 7 Protection Drift | LOW | LOW | AGENT-BUILD-B | 383d7ae9cc12ef9c05e1a70c211e2dacfd729ab7 | 0501e3c76cc02c89f6cec214416ee196b81bd7cb | 4b8436b16a5ba3c9fd1f64210751bae50b970815d2243d7c9f6020297104b1d0 | S7 | LOCK-MA-V1-ACC-PROTECTION-DRIFT-001-02 | 227 | CI 35510776182; Phase A 35510776143 | CI_DETERMINISTIC / drift simulation | Four simulations executed without production protection mutation | GitHub Actions 15368 | verify PASS; phase-a PASS | TEST_ONLY PR events | N/A | N/A | N/A | Merge Policy 35510776175; 4/4 simulated drifts detected and merge blocked | N/A | N/A | Missing required check / bypass actor / force-push / integration mismatch each must block | BLOCKED_AS_EXPECTED; DRIFT_DETECTED 4/4 | CLOSED_UNMERGED / ABORTED / LOCK RELEASED | 2026-09-20T12:32:25Z |

## Scope Appendix

- **S1** — MoneyToman boundary regression test; exact Task Contract; Task Catalog.
- **S2** — token telemetry implementation/test/docs; exact Task Contract; Task Catalog.
- **S3** — pricing non-finite validation implementation/test; exact Task Contract; Task Catalog; deterministic dependent Step56/57 generated product-design artifacts.
- **S4** — lock-conflict harness; exact Task Contract; Task Catalog.
- **S5A** — intentional broken-test harness; exact Task Contract; Task Catalog.
- **S5B** — artifact-mutation harness; exact Task Contract; Task Catalog.
- **S5C** — fresh V1.6 scope-violation harness; exact Task Contract; Task Catalog. The inert fixture `test/fixtures/v1-acceptance-scope-violation-r2-v16/undeclared.txt` is intentionally outside declared write scope and never entered main.
- **S5D** — exhaustive state-machine coverage harness; exact Task Contract; Task Catalog.
- **S6** — authority-separation harness; exact Task Contract; Task Catalog.
- **S7** — protection-drift simulation harness; exact Task Contract; Task Catalog.

## Phase Evidence

### Phase 1

- Historical Exit Audit: PR #225 comment `5749717825`.
- V1.5→V1.6 Compatibility Proof: Phase 1 acceptance semantics UNAFFECTED.
- Fresh V1.6 Test 5C R2 superseding the reused Test 5C evidence: PR #233 / terminal comment `5750332950`.
- Result: `PASS`.

### Phase 2

- Historical Exit Audit: PR #228 comment `5750005585`.
- Fresh terminal Test 6 provider packet: PR #230 / comment `5750088449`.
- V1.5→V1.6 Compatibility Proof: Phase 2 acceptance semantics UNAFFECTED.
- Result: `PASS`.

## Test 5D Exhaustive Matrix Summary

```text
canonical_states = 20
ordered_pairs = 400
allowed_transitions = 34
illegal_transitions = 366
unique_illegal_pairs = 366
illegal_transitions_accepted = 0
all_illegal_expected = REJECTED
all_illegal_actual = BLOCKED_AS_EXPECTED
complete_valid_lifecycle = ACCEPTED
```

The full row-level 366-pair provider-backed matrix remains in the immutable PR #225 artifact/evidence and is not duplicated here.

## Test Evidence Isolation

```text
Open Test PRs = 0
Active Acceptance Locks = 0
Active Test Fixtures on main = 0
Accepted Test Evidence in Production = 0
Unauthorized main writes from negative tests = 0
Negative-test workflow_dispatch executions = 0
Negative-test merges = 0
```

The two known scope-violation fixtures from PR #229 and PR #233 are both absent from canonical `main`.

## Matrix Result

```text
Positive Flows = PASS
Negative Flows = PASS
Full State Machine Negative Coverage = PASS
Test Evidence Isolation = PASS
Fake PASS = 0
Illegal Transition Accepted = 0
FINAL_EVIDENCE_MATRIX = PASS
```
