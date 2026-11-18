# Step 70-G — Supplier Invoice warehouse-scope security remediation

**Status:** PROPOSED / HIGH / NOT CANONICAL / NOT MERGED  
**Task:** `EQCOFE-STEP70-G-INVOICE-WAREHOUSE-SCOPE-001`  
**Parent:** [Issue #388](https://github.com/rahemih/Eqcofe/issues/388) and HOS-74  
**Base:** `main@58ac38b730f192799ca582e7d2e0b70ecb580989`

## Source-confirmed issue and threat model

Restricted warehouse staff could read supplier invoices not linked to a PO due to `po.id IS NULL` override in listing SQL, or create, dispute or cancel an unlinked invoice without a global warehouse scope assertion. Additionally, a linked invoice whose PO record is absent could be mutated without a successful warehouse check. These are object-level authorization failures for procurement amounts and audited status changes; normal permission checks alone do not enforce warehouse scope.

## Minimal implementation

1. In `ProcurementRepository.invoices(allowed)`, remove the `OR po.id IS NULL` escape. Null `allowed` means global authorization and retains visibility. An explicit warehouse allowlist can only see invoices whose linked PO resolves into an allowed warehouse.
2. In `ReceiptCostService.createInvoice`, retain supplier, PO association and warehouse checks, but require `ScopePolicy.assertGlobal(actor,'warehouse')` when there is no PO.
3. In `transitionInvoice`, fail closed for missing linked PO, check warehouse authorization before state-dependent information is returned, and require global warehouse scope for unlinked invoices. Preserve recorded-state, reason, matching/amount rules and `expected` version update.
4. No migration, new invoice warehouse field, change to controller RBAC, reason aliases, Step-Up, idempotency, OpenAPI schema or other runtime modules. Existing global procurement users keep deliberate unlinked invoices.

## Security regression coverage

Behavioral service negative/positive tests cover warehouse-scoped and global staff: scoped list argument, create without PO forbidden, unlinked disputed/cancelled/matched forbidden, linked PO cross-warehouse and absent PO forbidden, matching amount and recorded status, no mutation/audit on unauthorized calls. Repository SQL predicate is asserted from source. An independent live PostgreSQL query test is **not claimed** by these unit tests; Phase A and the repository integration suite must also pass.

## Governance and outstanding dependencies

This PR is a **separate HIGH-risk security repair**, not an amendment to B1 PR #390's frozen three-alias scope. The recently merged two-person governance helper does **not** yet allowlist this new Task ID. A separate, authorized, protected governance PR must explicitly add this exact ID before the owner-only security alternative can be used; until then Merge Policy must block. No assistant can claim independent security review. Project Owner separately decides owner risk and later Human Gate on exact HEAD/artifact, only after all tests pass. No merge or Step70 closure is presumed. Step71 is excluded.

## Exact SHA256 provenance (Step 56/57)

Changing the supplier invoice service and repository invalidates the frozen source hashes in Step56-D. The generated Step56-D source references, D manifest, H union audit/manifest and Step57 foundation were recomputed from exact UTF-8 source blobs; no page frames, user journeys, visual review verdicts, runtime endpoints or history were altered. The full `pnpm verify` validator remains required. An earlier failing Canonical CI run revealed the missing provenance chain and is **not** considered a pass.

Existing controller staff permissions remain unchanged; specifically the supplier-invoice cancel route historically has no `@RequireStepUp` decorator. This security fix does not invent a new Step-Up check or claim one is present.

## Full Step56/57 transitive source dependency chain

The source-hash-only refresh includes Step56 E commerce, F customers, G management alongside D pricing/inventory, their three manifests, H final audit/manifest, and Step57 foundation. This is necessitated by the generator dependency chain D → E → F → G, not a redesign or regression waiver. The original exact-head Canonical CI failure on missing E source hash was used as the diagnostic evidence, not declared PASS.
