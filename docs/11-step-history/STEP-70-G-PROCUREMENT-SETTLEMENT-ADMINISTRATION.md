# EQCOFE — Step 70-G Procurement Settlement Administration

Status: **DISCOVERY / HIGH-RISK TASK FROZEN / NOT_CANONICAL**

Canonical base: `946ccb63ed210305b0ced2fb12143944ff37b796` (Step 70-F postmerge PASS, Lock RELEASED comment `6465016528`, workflow run `40660305178`). Linear: `HOS-74`.

## Frozen surfaces and 23 operations
- AD-D-15 Goods Receipt: list/detail/create/update/submit/post/reverse (7).
- AD-D-16 Landed Cost: list/detail/create/preview-allocation/finalize (5).
- AD-D-17 Supplier Invoice: list/create/match/dispute/cancel (5).
- AD-D-18 Purchase Return: list/detail/create/approve/ship/complete (6).

## Backend/contract findings (source-authoritative)
- Receipt `accepted_quantity + quarantine_quantity + rejected_quantity === received_quantity`; owned stock is accepted+quarantine, never rejected. Purchase Order linkage and net unit cost are Backend-controlled. Post/reverse require WebAuthn Step-Up, If-Match and server Idempotency-Key. Reverse requires a nonblank reason.
- Landed Cost requires a source-linked PO/posted Goods Receipt, integer Toman, permitted runtime cost types `shipping|insurance|customs|handling|other`, allocation `quantity|value|manual` only. OpenAPI includes `weight` but current service rejects it.
- Supplier Invoice create requires supplier, invoice number/date and nonnegative Toman amount. Match requires linked PO with exact supplier-payable total. Dispute/cancel require an explicit reason.
- Purchase Return requires active supplier, warehouse, reason, unique variants and positive quantities; default stock bucket `quarantine`. Approve checks separation of duties, ship performs inventory decrement, and transitions require version.

## Contract/runtime drift — fail-closed
1. `goods-receipts/{id}/reverse` OpenAPI body is `ApproveRequest {comment?}`; runtime reads `reason ?? note`, which can silently drop the canonical comment. No reverse action is exposed until compatibility is resolved.
2. `supplier-invoices/{id}/dispute` and `cancel` OpenAPI body is `ResolveRequest {resolution_note}`; runtime reads `reason ?? note`. No reason-bearing mutation is exposed until resolved.
3. `landed-costs/{id}/preview-allocation` OpenAPI contains `allocation_method` and `manual_allocations`; runtime only reads `allocations`, using stored draft method. The API does not establish source authority for changing method during preview.
4. `landed-costs/{id}/finalize` contract demands `preview_id`, but runtime accepts optional `allocations` and never consumes or validates preview_id. **Do not present a preview_id binding or completion guarantee** without independent Backend remediation.
5. Contract `weight` allocation exists but runtime does not support it. Suppress as NON_AUTHORITY, never silently change to quantity.

A Backend compatibility repair or extension, if authorized, MUST be a separate HIGH-risk scope and propagate Step56/57 source provenance hashes; this frontend-only Task Contract explicitly forbids such mutation.

## Required authority
- Admin Auth Bridge is sole server-side credential bridge; browser cannot supply idempotency headers, step-up tokens or raw admin credentials.
- Idempotent endpoints: receipt create/post/reverse; landed create/finalize; invoice create; return create/ship.
- Explicit `If-Match` for versioned mutations, 409/412/428 fail closed. WebAuthn Step-Up only receipt post/reverse, landed finalize and return approve/ship.
- Timeout, network, 408, 5xx mutation outcome is UNKNOWN, never auto-replay. Re-read canonical state before any new command.
- Server enforces permissions, warehouse scope, PO matching, states, inventory, ledger and separation of duties.

## Gates and scope
Only `apps/admin/**`, this history, this task and generated task catalog are mutable. No Backend, OpenAPI, generated schemas, database, POS, inventory, step70-H, Step71 or Graph changes. CI, Phase A, CodeQL, deterministic Review, independent Security, exact-artifact Scope Lock ACTIVE, Project Owner Human Gate, protected merge, exact-SHA postmerge verify and Lock RELEASED are mandatory.

**Checkpoint:** authority mapped and contract frozen. Implementation, tests and exact-head evidence pending. No risk-bearing mutation should be enabled on unsupported runtime contracts.
