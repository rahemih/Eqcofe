# Step 70-G B2C — Landed-cost creation linked PO scope hardening

Status: HIGH / DRAFT / NOT CANONICAL.
Base: main@7da3daa7802d404a26a32bd2a87d89734482af11. Task EQCOFE-STEP70-G-B2C-LANDED-CREATE-LINK-SCOPE-001; security issue #396, parent #388, Linear HOS-74.

## Gap and narrow remedy
A posted standalone Goods Receipt could previously be provided alongside an explicit Purchase Order from another warehouse without checking PO existence, warehouse or scope when the receipt's own PO link was null. Inside the existing transaction, resolve any supplied or inherited PO, assert actor warehouse scope, require receipt/PO warehouse and supplier agreement, and deny before numbering, persistence, inventory or audit. Keep receipt-only and PO-only flows supported, existing reasons/state guards untouched. No new endpoints or contracts.

## Tests and deterministic provenance
Twelve scoped regression tests cover cross-warehouse/unauthorized, global-scope mismatch, missing PO, supplier mismatch, valid explicit/inherited links, receipt-only and PO-only. Eleven Step56/57 artifacts are SHA256 source-provenance substitutions only, with no changed UI semantics or historical approvals.

## Governance and dependency
B1 successor #413 and B2 successor #418 are canonically complete; this clean B2C successor requires its own exact-head checks and new owner gates. This branch is parallel preparation only, NOT MERGE ELIGIBLE. Bounded non-independent internal assessment + separate explicit Owner Risk (or truly independent security review), ACTIVE Scope Lock and later separate explicit Owner Human Gate, protected merge, exact-SHA postmerge and terminal Lock RELEASED are mandatory. No B3 API, 70-H, Step71 or Graph/Graphify. 

## Current-main security invariants
Preserve B1/Invoice and B2 `assertLandedWarehouseScope` preview/finalize controls. Only harden `createLandedCost` authoritative PO lookup/warehouse/supplier/scope before number allocation. Twelve service mock tests are not an independent live-HTTP/PostgreSQL penetration test. Inherited create-path audit absence, PO-only allocation warehouse-integrity, transaction lock ordering, and preexisting corrupt links require separate review; no implicit waiver. This task does not authorize Step70-H/Step71.
