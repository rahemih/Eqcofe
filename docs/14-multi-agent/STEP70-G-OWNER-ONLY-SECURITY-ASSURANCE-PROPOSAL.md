# EQCOFE Step 70-G — Owner-Only Internal Security Assurance (PROPOSED, INACTIVE)

**Proposal ID:** `EQCOFE-STEP70-G-OWNER-INTERNAL-ASSURANCE-GOV-001`  
**Issue:** [#399](https://github.com/rahemih/Eqcofe/issues/399)  
**Canonical base:** `main@946ccb63ed210305b0ced2fb12143944ff37b796`  
**Decision owner:** `@rahemih`  
**Status:** `PROPOSAL / DRAFT / NO MERGE / NO SECURITY PASS`

## 1. Explicit owner direction and non-equivalence

On 2026-11-17 the Project Owner authorized work on a **separate governance amendment PR** for an owner-and-assistant-only process. The owner acknowledged loss of *human reviewer independence* while requesting every technical security check, HIGH risk, Scope Lock, Human Gate and protected merge to remain intact. This is **not** consent to falsify independent Security evidence or merge PR #390; it is not a per-artifact Human Gate.

The assistant/implementer and Project Owner can perform and accept a documented **internal** security assessment; they **cannot honestly identify it as independent external review**. The proposed outcome must be named `OWNER_ACCEPTED_INTERNAL_SECURITY_ASSURANCE`, never `INDEPENDENT_SECURITY_PASS` or ordinary `SECURITY: PASS`.

## 2. Hard limits (all required)

- Narrow applicability only to separately listed Step70-G Task IDs. No global HIGH-risk override. Each affected PR needs an explicit contract amendment on its own newly validated HEAD/Artifact; no reuse of an old artifact's gate evidence.
- Exact-commit/provider checks: Canonical CI `verify`, Phase A `phase-a`, CodeQL (`Analyze (actions)`, `Analyze (python)`, `Analyze (javascript-typescript)` plus published CodeQL success on the same HEAD), deterministic Review, and all pre-existing mandatory regression suites. An unrun/neutral/failed/unknown check blocks.
- An internal reviewer report tied to exact HEAD and Artifact, containing threat model, coverage, negative tests, scope/privilege boundaries, outstanding issues and remedies; zero unresolved HIGH/CRITICAL findings for sensitive inventory, procurement and money flows.
- A *separate*, explicit owner risk-acceptance record tied to the exact HEAD/Artifact, affirming absence of a distinct human reviewer. The later regular Project Owner Human Gate remains separately required and must occur **after** evidence and ACTIVE Lock.
- Immutable normalized scope lock, protected ruleset, no bypass actors, no direct main mutation, clean PR history, protected merge, postmerge exact-SHA verify and terminal Lock RELEASED.
- The status in audit output MUST identify `OWNER_ACCEPTED_INTERNAL_SECURITY_ASSURANCE`; parser/test results MUST NOT fabricate a canonical independent `SECURITY:PASS`.
- Inherited unlinked supplier-invoice warehouse authorization limitation in `ReceiptCostService.createInvoice/transitionInvoice` is a tracked security issue; do not silently accept it as resolved by PR #390's three controller field-alias changes. Address missing linked PO and cross-warehouse abuse paths in separately authorized security-remediation scope.
- No automatic extension to Step70-H, 70-I/J, Step71, other projects, production secrets or external infrastructure.

## 3. Proposed enforcement mechanism — not yet implemented

1. Add explicit task-level opt-in and narrow allowlist to the Merge Policy Controller; preserve `HIGH` risk and existing `security_required` policy.
2. Require *distinct* internal security assessment and owner risk-acceptance evidence, each exact-artifact bound and authored by the approved owner transport; label the resulting assurance **non-independent**. Reject blank reports and wrong-author/wrong-HEAD/stale artifact.
3. Independently verify exact-head provider CodeQL and required CI statuses; deterministic Review and lock must still pass. Reject missing, stale or non-success CodeQL jobs and wrong provider app IDs.
4. Add unit/negative tests for unallowlisted tasks, missing acceptance, unresolved findings, wrong scope, stale artifact, insufficient CodeQL, altered owner, skipped mandatory tests, no Human Gate, Lock absence and ruleset bypass. Do not weaken existing canonical Security route.
5. Re-run entire repository verifier and CodeQL on each head; retain a distinct exact-artifact owner Human Gate after the policy is proven.
6. Treat governance PR itself as HIGH risk; do not claim that earlier proposal approval solves the self-referential amendment authorization problem. Any activation path must have independently verifiable CI and owner-specific exact-head authorization documented before merge.

## 4. No-go status / dependency chain

**Until code + tests and authorized activation are proven, the original independent Security Gate applies.** This document is a reviewable proposal, not a working exception. No merge now for [B1 #390](https://github.com/rahemih/Eqcofe/pull/390), [B2 #394](https://github.com/rahemih/Eqcofe/pull/394), [B2C #397](https://github.com/rahemih/Eqcofe/pull/397), [B3 #398](https://github.com/rahemih/Eqcofe/pull/398), [Frontend #387](https://github.com/rahemih/Eqcofe/pull/387), Step70-H or Step71. Keep [Linear HOS-74](https://linear.app/hossein123/issue/HOS-74/step-70-inventory-procurement-and-pos-administration) In Progress.

## 5. Checkpoint acceptance

The scope-freeze checkpoint now includes a **standalone, non-authorizing** evidence validator and eight negative/positive tests. It is not integrated into Merge Policy and grants NO merge permission. Merge Policy integration, full exact-head verification, and separate Owner gates remain pending. A green CI on this proposal alone is **not** proof that the alternative gate works. No owner Human Gate or governance merge is claimed by creating this PR.
