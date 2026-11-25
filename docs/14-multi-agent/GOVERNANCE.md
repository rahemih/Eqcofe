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

## Post-Item6 canonical milestone — 2026-09-15

Item 6 (**Merge Policy / protection validation**) is **CANONICAL CLOSED**.

Canonical evidence:

- PR: `#166`
- reviewed exact head: `395daaf44a01314ccb5f2db423a51d1ece2b6a8d`
- reviewed artifact hash: `ff1a4f2366051749cc291ebe28b0bcd41ce22c7fb5950b0e357725cc4163bf13`
- merge commit / canonical `main`: `6df69308082698e6fbd0ae802b1e24fce3d3f866`
- Human Gate: `APPROVED`
- required `merge-policy` check: `PASS` on the approved exact artifact
- post-merge Canonical CI: `PASS`
- post-merge Phase A Verification: `PASS`
- Ruleset `main`: `ACTIVE`, strict status checks enabled, no bypass actors
- required GitHub Actions contexts: `verify`, `phase-a`, `merge-policy`
- F-4: `CLOSED`

### Bootstrap exception closure

The final bootstrap merge occurred at PR `#166`. **Bootstrap Exception is now CLOSED permanently for V1.**

From this milestone onward:

- no manual/raw LLM-agent merge to `main` is a canonical path;
- every future merge must pass the protected-main required checks and Merge Policy Controller;
- LOW/MEDIUM tasks remain subject to their deterministic risk/review/verification policy;
- HIGH tasks additionally require exact-artifact Security assurance evidence **and** Project Owner Human Gate: for narrowly allowlisted, task-opted Step70-G work this may be non-independent `OWNER_ACCEPTED_INTERNAL_SECURITY_ASSURANCE` with separate documented `INTERNAL_SECURITY`, explicit `OWNER_RISK` and later distinct `HUMAN` approval; otherwise a real independent `SECURITY:PASS` remains mandatory;
- changing an artifact invalidates artifact-bound evidence and requires fresh verification/review as applicable;
- no future task may cite the Item 6 bootstrap exception as precedent.

### Frozen order remains unchanged

This milestone does **not** amend Architecture v1 or Specification v3.1 and does not renumber implementation items. The frozen order remains:

- Item 7: **Token Telemetry and Docs Automation**
- Item 8: **Pilot tasks — LOW → MEDIUM → HIGH**
- Item 9: **Calibration per risk class**
- Item 10: **V1 Production Gate**

Item 7 is not started by this documentation synchronization.

### Owner-required Pre-Pilot Verification Gate

Before the first Item 8 Pilot task is allowed to begin, a dedicated **Pre-Pilot Verification Gate** MUST reach PASS. This is a prerequisite gate for Item 8, not a new numbered implementation item and not a specification renumbering.

Minimum required coverage:

1. **Controller/unit regression** — all deterministic Multi-Agent controllers and auxiliary controls introduced through Items 1–7, plus the canonical repository regression suite.
2. **Cross-controller integration** — at minimum Lock ↔ Workflow, Risk ↔ Project Map, Artifact Binding ↔ Human Gate, and Merge Policy ↔ all required upstream gates.
3. **End-to-end deterministic dry runs without LLM execution** — one synthetic LOW task through the complete lifecycle and one synthetic HIGH task through Human Gate, with no production mutation.
4. **Negative/fail-closed scenarios** — lock conflict, attempted risk downgrade, artifact mutation after approval, unauthorized gate evidence, external-head/fork PR, spoofed required-check identity, stale evidence, and protection drift.
5. **Gate evidence** — exact-head deterministic test evidence, required CI PASS, Reviewer/QA disposition, and zero unresolved blocking findings.

If any mandatory Pre-Pilot check is `FAIL`, `PENDING`, `NOT_EXECUTED`, or otherwise unverified, Item 8 Pilot execution remains forbidden. The first real LOW Pilot is executed only after this gate passes; the Pilot itself is not counted as part of the Pre-Pilot Verification Gate.

## Step 70-G security assurance — OWNER-APPROVED NON-INDEPENDENT ROUTE (governed / active)

**Project Owner direction, 2026-11-21:** For narrowly allowlisted EQCOFE Step70-G tasks, the requirement to secure an *independent human security reviewer* is replaced by **documented internal security assessment + explicit, separate Project Owner risk acceptance and Human Gate approval**. A second, independent human reviewer is **not required** for such opted-in tasks. This is a knowingly lower assurance level than truly independent review and must never be labeled `SECURITY:PASS` or attributed to a fictitious independent person.

This route is **already implemented in canonical code**, not just a proposal: `scripts/multi-agent/owner-internal-security-assurance.mjs` and `scripts/multi-agent/merge-policy-controller.mjs` enforce `OWNER_ACCEPTED_INTERNAL_SECURITY_ASSURANCE` and the exact task allowlist. Historic owner-only proposals in Issue #399 and Draft PR #400 remain archival; protected Step70-G #413/#414 have used the governed route with an expressly recorded absence of independent human Security Gate and successful exact-SHA postmerge verification. The present documentation reconciliation changes **no runtime verification, controller, branch-protection rule, or permission**.

**Mandatory chronological evidence on each NEW exact HEAD + artifact SHA256:**
1. Documented bounded **internal** security evaluation: source/permission/diff review, threat model, adversarial and negative regression results, unresolved findings, and an auditable report. The evidence must clearly say `INTERNAL_SECURITY:ASSESSED` and `human_reviewer_independent=false`. Zero unresolved HIGH/CRITICAL findings is mandatory; this assessment **cannot** be self-described as independent.
2. Separate, explicit Project Owner `OWNER_RISK:ACCEPTED` with acknowledgement `NO_INDEPENDENT_HUMAN_SECURITY_REVIEW`, the affected task, HEAD and artifact, citing governance [Issue #399](https://github.com/rahemih/Eqcofe/issues/399). Ordinary policy approval is **not** artifact-specific risk acceptance.
3. Separate, later, explicit Project Owner `HUMAN:APPROVED` **after** internal assessment, owner-risk acknowledgement and active Scope Lock; the acceptance of reduced independence must remain transparent.

**Controls never removed or weakened:** HIGH classification, exact Task Contract and frozen write scope, active Scope Lock, required Canonical CI and Phase A from GitHub Actions, CodeQL aggregate plus all three provider analyzers, deterministic Review, Step57/Step58 quality where required, fixed GitHub branch protection with no bypass actor, official protected Merge Policy workflow, exact merged SHA on `main`, postmerge full Canonical and Phase A verification, and terminal `LOCK:RELEASED`. All evidence is bound to the CURRENT HEAD/artifact; new commits invalidate prior gates. No assertion of `SECURITY:PASS` independent reviewer is made or inferred.

**Applicability is not a blanket exception.** Only task IDs present in the canonical allowlist AND individually opted in through their own governed Task Contract may use the owner-accepted internal route. All other HIGH tasks remain subject to their existing independently reviewed Security Gate. Step70-G B2 [PR #415](https://github.com/rahemih/Eqcofe/pull/415) is allowlisted in code but must *separately opt in* through its task contract and earn its own fresh assessment, owner risk, Human Gate, CI, Lock and protected merge. No current authorization for #394, #397, #398, #404, or Step71 transfers from a historical PR.

Reference: [Governance decision #399](https://github.com/rahemih/Eqcofe/issues/399), [Step70-G B2 Owner-led evidence handoff #416](https://github.com/rahemih/Eqcofe/issues/416), and the archived [original proposal](https://github.com/rahemih/Eqcofe/blob/main/docs/14-multi-agent/STEP70-G-OWNER-ONLY-SECURITY-ASSURANCE-PROPOSAL.md).

**Governed change status:** this clarification enters canonical documentation only when its own exact-artifact GitHub protected-merge and postmerge checks complete successfully. Until then the last protected `main` text is authoritative.

## Step 70-H — PROPOSED exact-task owner-only security assurance amendment (HIGH, NOT ACTIVE UNTIL CANONICAL MERGE)

Proposal [Issue #427](https://github.com/rahemih/Eqcofe/issues/427) is **not a blanket authorization**. A separately governed, owner-approved protected merge may extend the *existing non-independent route* only to:
- `EQCOFE-STEP70-H-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-001` (this exact HIGH governance amendment itself);
- `EQCOFE-STEP70-H-POS-WAREHOUSE-SCOPE-BACKEND-001` (warehouse-scope backend PR #426);
- `EQCOFE-STEP70-H1-POS-SCAN-SALE-ADMIN-001` (POS sale Admin frontend PR #424).

**Before approval and protected merge, these remain NOT allowlisted on canonical main.** The governance candidate's self-ID is listed for candidate validation only; it has no power to grant itself OWNER_RISK or HUMAN approval and is subject to full HIGH provider/Scope Lock/CodeQL/protection enforcement. The user must **explicitly approve** accepting a non-independent human security assurance route at lower independence than external review for this amendment. Separately and chronologically, each target PR requires its own bounded source/threat evaluation, exact artifact and active Scope Lock, distinct Project Owner OWNER_RISK:ACCEPTED, later HUMAN:APPROVED, full exact-head Canonical CI/Phase A/Step57/Step58/CodeQL, official protected merge and exact-SHA postmerge/lock release. Historical G approvals do not transfer. Any other Step70-H2, Step70-I/J or Step71 task remains ineligible until separately governed.

No change to `scripts/multi-agent/merge-policy-controller.mjs`, branch protection, workflow, permissions, independent reviewer meaning, security check severity or any business code is allowed by this candidate.


## Step70-H2A narrow follow-on opt-in (2026-11-25, candidate only)

See `docs/14-multi-agent/STEP70-H2A-OWNER-ASSURANCE-AMENDMENT.md`. This **HIGH proposed** amendment changes only a frozen exact task allowlist and its negative tests for the governance candidate and H2A four-operation POS Admin Task. It is not effective before a separately authorized exact-artifact Project Owner risk acceptance, later Human Gate, full CI/CodeQL/Scope Lock and official protected merge/postmerge. No H2B, 70-I/J or Step71 and no independent human security review can be inferred. No waiver or wildcard.
