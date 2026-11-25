# Step70-H2A — exact-task owner-led internal security assurance amendment (DRAFT / HIGH)

Proposed in response to [Issue #432](https://github.com/rahemih/Eqcofe/issues/432), governing [PR #431](https://github.com/rahemih/Eqcofe/pull/431). **NOT IN FORCE BEFORE PROTECTED MERGE OF THIS AMENDMENT.**

## Two exact, separately gated Task IDs
- `EQCOFE-STEP70-H2A-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-001` (this governance amendment; requires own separate exact-artifact INTERNAL_SECURITY, owner risk and Human Gate)
- `EQCOFE-STEP70-H2A-POS-OFFLINE-RECONCILIATION-READ-001` (H2A capture/sync + read-only reconciliation only; must independently opt-in in its own Task Contract and earn fresh gates after the amendment is canonical)

No wildcard, no H2B retry/abandon, no Step70-I/J or Step71. The amendment does not grant either target an approval, audit, security PASS, merge, or independent human reviewer. It does not change CI, CodeQL, risk floor HIGH, Branch Protection, API, schema, payment, permissions or Merge Policy dispatch. Full independent review remains the default for tasks not exactly allowlisted.

## Explicit lower-independence risk and controls
The code-building assistant's bounded source review **is not independent human security assurance**. Project Owner must explicitly accept the lower independence for THIS governance PR's exact HEAD/Artifact after a formally recorded bounded internal assessment and then issue a separate later Human Gate. After the amendment protected merges with full postmerge verification and Scope Lock released, H2A may separately opt into `OWNER_ACCEPTED_INTERNAL_SECURITY_ASSURANCE`, subject to its own fresh negative security tests, owner risk, separate Human Gate and protected merge/postmerge. H2B is explicitly excluded.

Source anchor: prior Step70-H PR #428 allowed exactly PR #424 and PR #426; this is a new, separate policy decision not transferable from #428.
