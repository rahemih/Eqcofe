# EQCOFE Multi-Agent Governance

## Final approval — 2026-09-14

Architecture v1: **FROZEN**.

Specification v3.1: **APPROVED / FROZEN**.

Approval evidence:

- Layer 1 deterministic validator: PASS — 26/26 checks, 0 findings.
- Layer 2 independent Reviewer: PASS; approval recommended.
- Layer 3 Project Owner: APPROVED.
- Architecture changes required: NONE.
- Deferred blocking findings: NONE.

Implementation is authorized only through scoped branches and pull requests. No LLM agent may write or merge directly to `main`.

## V1.1 follow-up register

| ID | Follow-up | Type | Priority |
| --- | --- | --- | --- |
| F-1 | Expand `spec-validate.sh` coverage to all states, transitions, schemas and invariants. | Enhancement | Medium |
| F-2 | Add the final v3.1 review to the specification remediation register. | Documentation | Low |

These follow-ups are non-blocking for V1 implementation.

## Frozen implementation order

1. Project Map Builder.
2. Workflow / State Controller.
3. Scope / Lock Controller.
4. Risk Classifier and verification policy.
5. Artifact Hash Generator.
6. Merge Policy / protection validation.
7. Token Telemetry and Docs Automation.
8. Pilot tasks: LOW → MEDIUM → HIGH.
9. Calibration per risk class.
10. V1 Production Gate.
