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

## Bootstrap implementation record — PR #164

Task Contract: `docs/14-multi-agent/tasks/MA-BOOTSTRAP-001.json`.

### Scope rationale

PR #164 intentionally contains both the Project Map Builder and Workflow / State Controller as one bootstrap task. They are not direct code dependencies; they form a sequencing dependency in the first implementation slice. A fresh repository-derived Project Map is required before future dispatch can trust repository context, and the Workflow / State Controller is the next deterministic enforcement layer required before normal orchestration begins. Splitting them would not reduce sensitive-domain risk and would duplicate bootstrap-only manual controls.

### Risk classification and rationale

- deterministic risk floor: `LOW` — the changed multi-agent/governance paths are not protected commerce sensitive zones.
- Manager escalation: `MEDIUM` — `package.json` adds a repository-wide verification gate, so a defect can affect canonical CI behavior.
- effective risk: `MEDIUM`.
- Human Gate: `NOT REQUIRED`.

`HIGH` was explicitly considered and rejected for this task because the CI modification is additive only, no existing gate is removed or weakened, no sensitive commerce/business/financial domain is modified, no irreversible mutation exists, and the change has a simple dedicated revert path. The separate absence of branch protection is treated as a blocking external protection-drift condition rather than silently changing task risk.

### Manual Lock Bootstrap Exception

The Scope / Lock Controller does not yet exist at the start of PR #164 and therefore cannot govern its own bootstrap implementation.

A manual bootstrap lock is declared in the Task Contract:

- lock: `BOOTSTRAP-MANUAL-LOCK-MA-001`
- owner: `MA-BOOTSTRAP-001`
- scope: `docs/14-multi-agent/**`, `scripts/multi-agent/**`, `test/multi-agent/**`, and `package.json`
- lifecycle: active until PR #164 reaches a terminal outcome (merged or aborted)
- overlapping bootstrap mutations to that write scope are forbidden while active

This exception ends after the Scope / Lock Controller implementation becomes authoritative.

### Manual Verification Bootstrap Exception

The deterministic Verification Policy does not yet exist. PR #164 therefore uses the manually frozen bootstrap minimum defined in the Task Contract:

- `pnpm multi-agent:verify`
- `pnpm contract:validate`
- `pnpm design:validate`
- `pnpm arch:check`
- `pnpm policy:check`
- `pnpm build`
- `pnpm test`
- full `pnpm verify`

The current canonical package has no dedicated `lint` script, so bootstrap governance MUST NOT fabricate a lint PASS. Lint remains `NOT_CONFIGURED` until a canonical lint gate is explicitly introduced.

### Self-referential CI handling

PR #164 intentionally tests the new `multi-agent:verify` gate using the same PR that introduces it. If the gate fails, CI is FAIL, merge remains forbidden, the repair occurs in the same PR, `retry_count` increments, and the new exact head must be reverified. The MEDIUM retry policy permits at most two repair cycles.

### Sequential bootstrap rollback semantics

If Project Map Builder must be reverted after merge, the rollback task must revalidate Workflow / State Controller against the resulting map availability/compatibility. If safe independent operation cannot be proven, both services are reverted together in that new rollback task. If only Workflow / State Controller is reverted, Project Map Builder may remain only after independent validation. Every rollback requires a new task ID and explicitly identifies affected services.

### Protection Drift Bootstrap Exception — ACTIVE BLOCKER

Protection Drift Monitor is not implemented in PR #164. It remains scheduled in frozen implementation order item 6: **Merge Policy / protection validation**.

Direct GitHub evidence observed at `2026-09-14T08:01:40Z` shows:

- `main.protected = false`
- `main.protection.enabled = false`
- repository rulesets = `[]`

Therefore the protection check is currently **FAIL**, not merely `NOT_VERIFIED`. This is a real protection-drift blocker under Spec v3.1. PR #164 MUST NOT be declared merge-eligible until required `main` protection is enabled and GitHub evidence is rechecked successfully. No Owner attestation is invented or substituted for GitHub configuration evidence.

### `pnpm verify` integration and order

Before PR #164, canonical `pnpm verify` ran:

`contract:validate → design:validate → arch:check → policy:check → build → test`

PR #164 adds:

`multi-agent:verify`

between policy verification and build. It is placed before build because the deterministic Project Map + workflow invariant checks are lightweight and can fail earlier than the TypeScript build. Existing gates remain intact; none are removed.

### Bootstrap Task Contract token budget correction

The MEDIUM Task Contract now uses `expected_max=25000`, `soft_alert=35000`, `hard_cap=70000`. This preserves a real warning interval and avoids the previously rejected `expected_max == soft_alert` ambiguity.
