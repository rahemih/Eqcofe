# EQCOFE Multi-Agent Mission Amendments Registry

| Amendment | From | To | Old Mission Hash | New Mission Hash | Compatibility Proof | Owner Sign-off | Canonical Effect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MISSION-AMENDMENT-V1.4-TO-V1.5-001 | V1.4 | V1.5 | `5bb55bd0c83df9b3c196b29e9d0109dc1ff8a327c4c45d0f86cf7f5fe20cf5ad` | `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1` | `EQCOFE-MULTI-AGENT-V1.4-TO-V1.5-COMPATIBILITY-PROOF.md` | REQUIRED_EXTERNAL_HUMAN_GATE | Only after HIGH gates + protected merge + exact-SHA post-merge PASS |
| MISSION-AMENDMENT-V1.5-TO-V1.6-001 | V1.5 | V1.6 | `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1` | `b01ee3d1f02dc4b80d1780db26d2a5cc8163698fc2f6a5544bc8b707d425380e` | `EQCOFE-MULTI-AGENT-V1.5-TO-V1.6-COMPATIBILITY-PROOF.md` | REQUIRED_EXTERNAL_HUMAN_GATE | Only after HIGH gates + protected merge + exact-SHA post-merge PASS |

## Rules

- V1.4 Mission bytes remain immutable.
- This registry does not itself constitute Owner approval.
- Human approval is valid only in HUMAN_PENDING and must bind exact Task ID, Head SHA, Artifact Hash, and verified Owner identity.
- No V1.5 acceptance-test PASS is inherited from V1.4.


## V1.5 → V1.6 amendment constraint

- Root cause: Issue #231.
- Scope of semantic change: Acceptance Closure record terminalization only.
- Tests 1–7: UNAFFECTED only under the registered Compatibility Proof.
- Phase 3 and Final Live Revalidation: MUST RUN FRESH under V1.6.
- No V1.5 Mission bytes may be edited.
