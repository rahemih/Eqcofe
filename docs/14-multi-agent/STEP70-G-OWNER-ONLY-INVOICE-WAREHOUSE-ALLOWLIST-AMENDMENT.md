# Step70-G owner-only security assurance allowlist amendment R2 — DRAFT

**Tracking:** [Issue #407](https://github.com/rahemih/Eqcofe/issues/407). Target security repair [PR #404](https://github.com/rahemih/Eqcofe/pull/404).  
**Canonical base:** `main@58ac38b730f192799ca582e7d2e0b70ecb580989`.  
**Status:** PROPOSED / HIGH / NOT APPROVED / NO MERGE.

## Why this must be separate

The earlier governance amendment PR #403 (merged) does not permit arbitrary new Task IDs. HIGH warehouse invoice BOLA fix `EQCOFE-STEP70-G-INVOICE-WAREHOUSE-SCOPE-001` is deliberately not on the old allowlist; an assistant cannot claim the old owner risk/Human Gate authorizes this fix. The new governance Task `EQCOFE-STEP70-G-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-002` is separately versioned and self-listed in the candidate only to permit a newly consented, audited **HIGH** governance review, **not** to silently bootstrap a Security PASS. This self-editing governance change carries residual concentration-of-assurance risk, and its own owner risk acknowledgement must explicitly mention this fact.

## Frozen change set

In `scripts/multi-agent/owner-internal-security-assurance.mjs`, add precisely TWO Task IDs — this governance Task and the invoice BOLA repair Task. No changes to merge-policy-controller, GitHub Actions, dependencies, runtime, database, permission grants, unrelated Tasks, branch protection or the closed historical Issue #399. Existing non-independent report/owner-risk/separate Human order, latest provider CodeQL, exact SHA/artifact binding and scope lock remain intact. New tests verify both explicit IDs plus negative exclusions for unknown and Step71 tasks, opt-in omission, HIGH downgrade, incorrect owner-risk artifact and forged CodeQL provider.

## Activation

Run all exact-head CI/Phase A/CodeQL and deterministic REVIEW. Prepare a thorough limited non-independent technical report with any residual findings. Project Owner must make a new **exact-artifact** OWNER_RISK decision accepting loss of independent reviewer **for this PR only**, and then a separate Human Gate. Record ACTIVE exact-artifact lock before merge. Protected GitHub workflow_dispatch merge and exact-SHA postmerge required. No automatic approval transfers to invoice security PR #404, which needs its own exact-head gates later. No Step70-H or Step71.
