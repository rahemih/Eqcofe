# EQCOFE Multi-Agent Mission Registry

This registry binds byte-frozen mission specifications to their canonical mission hash.
A mission hash is SHA-256 over the exact UTF-8 bytes of the mission file.

| Version | File | SHA-256 | Registered UTC | Status |
| --- | --- | --- | --- | --- |
| V1.4 | EQCOFE-MULTI-AGENT-V1.4-EXECUTION-MISSION.md | `5bb55bd0c83df9b3c196b29e9d0109dc1ff8a327c4c45d0f86cf7f5fe20cf5ad` | `2026-09-20T06:43:09.531Z` | FROZEN |

| V1.5 | EQCOFE-MULTI-AGENT-V1.5-EXECUTION-MISSION.md | `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1` | `2026-09-20T07:01:00Z` | FROZEN |

## V1.4 registration rule

- Mission file: `docs/14-multi-agent/missions/EQCOFE-MULTI-AGENT-V1.4-EXECUTION-MISSION.md`
- MISSION_SPEC_STATUS: `FROZEN`
- Canonical registration becomes effective only after this registration PR is protected-merged and exact-SHA post-merge verification passes.
- Any byte mutation of the Mission file changes the hash and requires a new governed amendment or mission version.


## V1.5 amendment registration rule

- Predecessor: `V1.4` / `5bb55bd0c83df9b3c196b29e9d0109dc1ff8a327c4c45d0f86cf7f5fe20cf5ad`.
- Mission file: `docs/14-multi-agent/missions/EQCOFE-MULTI-AGENT-V1.5-EXECUTION-MISSION.md`.
- Mission SHA-256: `7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1` over exact UTF-8 LF bytes; the hash is not embedded in the Mission body.
- Source owner-provided candidate SHA-256 before mandatory version/status transformation: `3475a12f4c44a7d19db34308ba2049a8fe5bc1d6cd08e31051a7be66e9c2eae3`.
- MISSION_SPEC_STATUS: `FROZEN` only when this amendment completes required HIGH gates, protected merge, and exact-SHA post-merge verification.
- V1.4 remains byte-preserved and is superseded for future execution only after V1.5 becomes canonical.
- Owner amendment sign-off is an external artifact-bound Human Gate and is never self-certified by this registry.
