# Step 70-G B2C — Landed-cost creation linked PO scope hardening

Status: HIGH / DRAFT / NOT CANONICAL.
Base: main@946ccb63ed210305b0ced2fb12143944ff37b796. Task EQCOFE-STEP70-G-B2C-LANDED-CREATE-LINK-SCOPE-001; security issue #396, parent #388, Linear HOS-74.

## Gap and narrow remedy
A posted standalone Goods Receipt could previously be provided alongside an explicit Purchase Order from another warehouse without checking PO existence, warehouse or scope when the receipt's own PO link was null. Inside the existing transaction, resolve any supplied or inherited PO, assert actor warehouse scope, require receipt/PO warehouse and supplier agreement, and deny before numbering, persistence, inventory or audit. Keep receipt-only and PO-only flows supported, existing reasons/state guards untouched. No new endpoints or contracts.

## Tests and deterministic provenance
Eight scoped regression tests cover cross-warehouse/unauthorized, global-scope mismatch, missing PO, supplier mismatch, valid explicit/inherited links, receipt-only and PO-only. Eleven Step56/57 artifacts are SHA256 source-provenance substitutions only, with no changed UI semantics or historical approvals.

## Governance and dependency
Requires B1 PR #390 then B2 PR #394 canonical completion, then rebase/re-generate exact artifact and gates for B2C. This branch is parallel preparation only, NOT MERGE ELIGIBLE. Independent Security PASS, exact Scope Lock ACTIVE, explicit Owner Human Gate, protected merge, exact-SHA postmerge and terminal Lock RELEASED are mandatory. No B3 API, 70-H, Step71 or Graph/Graphify. 
