# MA-PROTECTION-DRIFT-001 — Branch Protection Drift

**Status:** OPEN / RCA_PENDING — PROTECTION REMEDIATED  
**Severity:** Governance / Merge Protection  
**Affected branch:** `main`  
**Discovered during:** PR #164 Bootstrap Review  
**Discovered at:** `2026-09-14T08:01:40Z`  
**Discovered by:** Executor / governance verification

## Summary

During bootstrap verification for PR #164, direct GitHub evidence showed that the canonical `main` branch did not have required protection enabled.

Initial observed evidence:

- `main.protected = false`
- `main.protection.enabled = false`
- repository rulesets = `[]`

This was a real Protection Drift condition under the frozen EQCOFE Multi-Agent System Spec v3.1. Merge eligibility was denied immediately and no bypass was accepted.

The Project Owner subsequently enabled a repository ruleset for `main`. Direct GitHub re-read now confirms that the protection failure itself is remediated. The incident remains open only for V1.1 root-cause investigation and final reviewer disposition.

## Timeline

1. Spec v3.1 was approved and frozen by the three-layer governance process.
2. PR #164 was opened as the first implementation bootstrap task.
3. During independent review, the absence of implemented Protection Drift Monitor was identified as a bootstrap gap requiring manual verification.
4. Direct GitHub read at `2026-09-14T08:01:40Z` returned `main.protected=false`, `main.protection.enabled=false`, and no repository rulesets.
5. Merge eligibility was immediately denied. No bypass or substitute Owner attestation was accepted.
6. Incident `MA-PROTECTION-DRIFT-001` was opened and marked blocking.
7. Project Owner configured an active branch ruleset for `main`.
8. GitHub re-read confirmed `main.protected=true` and repository ruleset `main` id `23278861` with `enforcement=active` targeting `refs/heads/main`.
9. Ruleset details confirmed pull-request enforcement, approvals `0`, strict required status checks, deletion protection, non-fast-forward protection, empty bypass list, and required GitHub Actions checks `Canonical CI` and `Phase A Verification`.
10. The immediate protection failure was marked remediated. Root cause remains unknown and deferred to V1.1 follow-up F-3.

## Evidence

### Initial failure evidence

```text
main.protected          = false
main.protection.enabled = false
repository rulesets     = []
```

### Remediation evidence

Direct GitHub Ruleset evidence now shows:

```text
main.protected                    = true
ruleset.id                        = 23278861
ruleset.name                      = main
ruleset.enforcement               = active
ruleset.target                    = refs/heads/main
bypass_actors                     = []
current_user_can_bypass           = never
required_approving_review_count   = 0
strict_required_status_checks     = true
required_check[0]                 = Canonical CI / GitHub Actions
required_check[1]                 = Phase A Verification / GitHub Actions
deletion protection               = enabled
non-fast-forward protection       = enabled
```

The branch endpoint may still report `protection.enabled=false` for the legacy branch-protection object. That field is not the authoritative protection mechanism for this repository now. The authoritative current evidence is `main.protected=true` plus the active repository Ruleset API configuration above.

## Root Cause

**UNKNOWN — INVESTIGATION REQUIRED**

No root cause is accepted without evidence.

Unverified hypotheses:

1. Protection was never configured initially.
2. Protection was configured and later removed or weakened.
3. Protection was lost during repository migration, recreation, or restore.

These are investigation hypotheses only, not project facts.

## Investigation Plan — V1.1 Follow-up

The full root-cause investigation is deferred until after PR #164 is safely merged, but it remains a mandatory V1.1 governance follow-up.

### 1. GitHub Audit Log

Determine whether branch protection or repository rules ever existed, when they changed, and which actor performed the change. If audit-log access is unavailable for the account/repository plan, record that limitation explicitly rather than inferring history.

### 2. Repository Settings History

Inspect any available repository/ruleset history or configuration records for evidence of prior protection configuration.

### 3. Repository Migration / Restore Records

Inspect available migration, transfer, recreation, backup, restore, or repository replacement records to determine whether settings could have been lost outside Git history.

### 4. Initial Repository Setup

Review setup evidence, historical governance notes, issues, PRs, automation configuration, or other canonical records to determine whether branch protection was ever an explicit initial setup requirement and whether it was actually applied.

### 5. Administrative Access Review

Identify which authorized collaborators or integrations had repository administration capability during the relevant period. Do not attribute a change to any person without direct evidence.

## Investigation Output Requirements

The final investigation update to this file must include:

- Evidence-backed timeline
- Confirmed root cause, or `UNRESOLVED` if evidence is insufficient
- Evidence references
- Affected control(s)
- Corrective action taken
- Preventive action
- Residual risk
- Reviewer disposition

If evidence remains insufficient, the correct result is `ROOT CAUSE UNRESOLVED`, not a guessed cause.

## Immediate Corrective Action — COMPLETED

The Project Owner enabled required V1 protection for `main`, and direct GitHub Ruleset evidence verified the configuration.

Verified controls:

- Pull request required before merge
- Required status checks: `Canonical CI` and `Phase A Verification`
- Branch must be up to date before merge
- No bypass actors
- Force pushes denied through non-fast-forward protection
- Branch deletion denied
- Required approvals fixed at `0` for the GitHub layer

Signed commits, deployment gates, and branch locking are not required for V1.

## Temporary Mitigation

Until deterministic Protection Drift Monitor exists:

- Protection configuration is checked manually from GitHub before merge.
- `NOT_VERIFIED` never equals PASS.
- Failed protection evidence blocks merge even when CI passes.
- Owner attestation alone is not a substitute for GitHub configuration evidence.

## Preventive Action

Protection Drift Monitor / Merge Policy protection validation MUST be implemented before the first HIGH-risk task.

The monitor must detect missing or weakened required protections and fail closed.

## Deferred Follow-up

**V1.1 Follow-up F-3:** Perform the five-step root-cause investigation after PR #164 merge.

Deferral applies only to root-cause investigation. The missing-protection failure itself has been remediated and independently verified.

## Closure Criteria

The immediate protection blocker is remediated. PR #164 may only become merge-eligible when the remaining gates are also satisfied:

1. Required `main` protection remains active on final re-read. **PASS**
2. Exact-head CI for PR #164 passes after the final governance/incident synchronization. **PENDING until final head completes CI**
3. Independent Layer 2 Review 3 passes. **PENDING**

The incident itself remains open for V1.1 root-cause investigation until the investigation output is completed and reviewed.
