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
| F-3 | Complete the evidence-backed root-cause investigation for `MA-PROTECTION-DRIFT-001` using the five-step investigation plan in the incident record. | Governance / Incident Investigation | High |
| F-4 | Wire Merge Policy Controller enforcement into a GitHub-required CI status check so HIGH-risk Human Gate cannot be bypassed by static GitHub approval settings. Must be complete before the first HIGH-risk task. | Governance / Merge Enforcement | High |

These follow-ups are non-blocking for PR #164. F-3 now concerns root-cause investigation only; the missing branch protection itself has been remediated and independently verified. F-4 is not required for PR #164 because this bootstrap task is MEDIUM and has no Human Gate, but F-4 is a hard prerequisite before the first HIGH-risk task.

## Approval model clarification

GitHub required-approval count is static and cannot vary by EQCOFE task risk. Therefore V1 uses the following split of responsibilities:

- GitHub required approvals: `0`.
- LOW / MEDIUM / HIGH review: Reviewer / QA pipeline according to task policy.
- HIGH Human Gate: enforced by the EQCOFE Merge Policy Controller using artifact-bound human approval state.
- Merge execution: deterministic protected-main infrastructure only.

This model is valid only if Merge Policy Controller enforcement is itself included in a GitHub-required status check before the first HIGH-risk task. Until implementation item 6 is complete, no HIGH-risk task may become merge-eligible.

Accepted wiring options for F-4:

1. `Canonical CI` contains a mandatory `merge-policy-validate` step and that workflow remains a required status check; or
2. a dedicated `Merge Policy Validation` status check is added to GitHub required checks.

For PR #164, required GitHub checks remain `Canonical CI` and `Phase A Verification`. This PR does not exercise HIGH-risk Human Gate enforcement.

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

`HIGH` was explicitly considered and rejected for this task because the CI modification is additive only, no existing gate is removed or weakened, no sensitive commerce/business/financial domain is modified, no irreversible mutation exists, and the change has a simple dedicated revert path.

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

### Protection Drift Bootstrap Exception — PROTECTION REMEDIATED / REVIEW 3 PENDING

Protection Drift Monitor is not implemented in PR #164. It remains scheduled in frozen implementation order item 6: **Merge Policy / protection validation**.

Initial direct GitHub evidence observed at `2026-09-14T08:01:40Z` showed:

- `main.protected = false`
- `main.protection.enabled = false`
- repository rulesets = `[]`

That initial result was correctly treated as a real Protection Drift blocker. The Project Owner then enabled an active repository ruleset for `main`, and direct GitHub re-read verified remediation.

Current protection evidence:

- `main.protected = true`
- ruleset id: `23278861`
- ruleset name: `main`
- target: `refs/heads/main`
- enforcement: `active`
- bypass actors: none
- current user bypass: `never`
- deletion protection: enabled
- non-fast-forward / force-push protection: enabled
- pull request required
- GitHub required approvals: `0`
- strict required status checks: enabled
- required check: `Canonical CI` from GitHub Actions
- required check: `Phase A Verification` from GitHub Actions

The branch endpoint may still report `protection.enabled=false` for the legacy branch-protection object. That field is not the authoritative mechanism for the current repository configuration. The authoritative evidence is `main.protected=true` together with the active Ruleset API configuration above.

### Protection Drift incident record

Canonical incident file: `docs/14-multi-agent/incidents/MA-PROTECTION-DRIFT-001.md`.

- Incident ID: `MA-PROTECTION-DRIFT-001`
- Status: `OPEN / RCA_PENDING — PROTECTION REMEDIATED`
- Root cause status: `UNKNOWN — INVESTIGATION REQUIRED`
- Root-cause candidates remain hypotheses only.
- Required Owner protection action: `COMPLETED / VERIFIED`
- Temporary control until implementation item 6: manual GitHub configuration verification before merge; missing/failed protection remains blocking.
- Permanent follow-up: Protection Drift Monitor / Merge Policy protection validation MUST be implemented before the first HIGH-risk task.
- Root-cause investigation: deferred to V1.1 follow-up F-3 after safe PR #164 merge.

The incident file contains the five-step investigation plan covering GitHub Audit Log, repository settings history, migration/restore records, initial repository setup evidence, and administrative access review. The final investigation must produce an evidence-backed timeline, confirmed root cause or `UNRESOLVED`, corrective/preventive actions, residual risk, and reviewer disposition.

### Exact-head CI evidence before final governance synchronization

For exact head `715550b77fb9c1f1e846a308fe288796470392f3`:

- Canonical CI run `34821795304`: `SUCCESS`
  - job `103904805413`: `SUCCESS`
  - `pnpm verify`: `SUCCESS`
- Phase A Verification run `34821795446`: `SUCCESS`
  - job `103904806074`: `SUCCESS`

These results prove that head only. Because this governance synchronization itself changes the PR head, the final head must pass both required workflows again before Review 3 / merge eligibility.

### `pnpm verify` integration and order

Before PR #164, canonical `pnpm verify` ran:

`contract:validate → design:validate → arch:check → policy:check → build → test`

PR #164 adds:

`multi-agent:verify`

between policy verification and build. It is placed before build because the deterministic Project Map + workflow invariant checks are lightweight and can fail earlier than the TypeScript build. Existing gates remain intact; none are removed.

### Bootstrap Task Contract token budget correction

The MEDIUM Task Contract uses `expected_max=25000`, `soft_alert=35000`, `hard_cap=70000`. This preserves a real warning interval and avoids the previously rejected `expected_max == soft_alert` ambiguity.
