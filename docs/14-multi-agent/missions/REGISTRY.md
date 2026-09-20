# EQCOFE Multi-Agent Mission Registry

This registry binds byte-frozen mission specifications to their canonical mission hash.
A mission hash is SHA-256 over the exact UTF-8 bytes of the mission file.

| Version | File | SHA-256 | Registered UTC | Status |
| --- | --- | --- | --- | --- |
| V1.4 | EQCOFE-MULTI-AGENT-V1.4-EXECUTION-MISSION.md | `5bb55bd0c83df9b3c196b29e9d0109dc1ff8a327c4c45d0f86cf7f5fe20cf5ad` | `2026-09-20T06:40:59.579Z` | FROZEN |

## V1.4 registration rule

- Mission file: `docs/14-multi-agent/missions/EQCOFE-MULTI-AGENT-V1.4-EXECUTION-MISSION.md`
- MISSION_SPEC_STATUS: `FROZEN`
- Canonical registration becomes effective only after this registration PR is protected-merged and exact-SHA post-merge verification passes.
- Any byte mutation of the Mission file changes the hash and requires a new governed amendment or mission version.
