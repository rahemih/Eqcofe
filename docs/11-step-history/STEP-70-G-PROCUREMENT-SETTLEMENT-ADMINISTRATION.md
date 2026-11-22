# EQCOFE — Step 70-G Procurement Settlement Administration

Status: **CLEAN-CURRENT-MAIN IMPLEMENTATION CANDIDATE / HIGH / NOT_CANONICAL / NO_GATE_PASS**

Canonical base: `5ec04f5c5e61a58cbd195df6b1f60dd827cdbdf0` (#420 B3 protected postmerge verified and LOCK:RELEASED, #413 B1, #414 invoice warehouse, #418 B2, #419 B2C). Old #387 HEAD and approval/CI history do not transfer. Linear: `HOS-74`.

## Frozen surfaces and 23 operations
- AD-D-15 Goods Receipt: list/detail/create/update/submit/post/reverse (7).
- AD-D-16 Landed Cost: list/detail/create/preview-allocation/finalize (5).
- AD-D-17 Supplier Invoice: list/create/match/dispute/cancel (5).
- AD-D-18 Purchase Return: list/detail/create/approve/ship/complete (6).

## Backend/contract findings (source-authoritative)
- Receipt `accepted_quantity + quarantine_quantity + rejected_quantity === received_quantity`; owned stock is accepted+quarantine, never rejected. Purchase Order linkage and net unit cost are Backend-controlled. Post/reverse require WebAuthn Step-Up, If-Match and server Idempotency-Key. Reverse requires a nonblank reason.
- Landed Cost requires a source-linked PO/posted Goods Receipt, integer Toman, permitted runtime cost types `shipping|insurance|customs|handling|other`, allocation `quantity|value|manual` only. Canonical OpenAPI and Backend both exclude unsupported `weight`; the stored method is quantity, value or manual.
- Supplier Invoice create requires supplier, invoice number/date and nonnegative Toman amount. Match requires linked PO with exact supplier-payable total. Dispute/cancel require an explicit reason.
- Purchase Return requires active supplier, warehouse, reason, unique variants and positive quantities; default stock bucket `quarantine`. Approve checks separation of duties, ship performs inventory decrement, and transitions require version.

## Reconciled source authority (fresh main)
- B1 #413 canonical maps goods receipt reverse `ApproveRequest.comment` and supplier invoice dispute/cancel `ResolveRequest.resolution_note`. The Admin only submits these recognized properties, requires explicit reason, and preserves If-Match; reverse uses WebAuthn + server idempotency.
- B2 #418 and B2C #419 preserve fail-closed receipt/PO warehouse permissions. Supplier invoice warehouse BOLA fix #414 is canonical.
- B3 #420 canonical aligns create (optional method with default quantity; quantity/value/manual only), preview and finalize optional allocations under the persisted method, no invented preview_id, no weight. Preview does not persist an allocation token; finalization recomputes and checks authoritative scope/version within Backend.
- Admin enables all 23 operations with source-backed request shape, guards, step-up and unknown-outcome policy. Application must not claim approved or production ready until fresh HEAD CI and security/Human gates pass.

## Required authority
- Admin Auth Bridge is sole server-side credential bridge; browser cannot supply idempotency headers, step-up tokens or raw admin credentials.
- Idempotent endpoints: receipt create/post/reverse; landed create/finalize; invoice create; return create/ship.
- Explicit `If-Match` for versioned mutations, 409/412/428 fail closed. WebAuthn Step-Up only receipt post/reverse, landed finalize and return approve/ship.
- Timeout, network, 408, 5xx mutation outcome is UNKNOWN, never auto-replay. Re-read canonical state before any new command.
- Server enforces permissions, warehouse scope, PO matching, states, inventory, ledger and separation of duties.

## Gates and scope
Only the nine exact permitted paths declared by the new frontend Task Contract are changed; no Backend, OpenAPI, generated schemas, database, POS, inventory, 70-H, Step71 or Graph changes. The pre-existing B3 Scope Lock was released only following official protected postmerge run #45009072159. This candidate requires its own fresh Canonical CI, Admin typecheck/lint/build, functional and negative tests, Phase A/PostgreSQL, Step57, Step58, CodeQL aggregate and three analyzers, deterministic Review, Security assessment, new exact-artifact ACTIVE Scope Lock, distinct Project Owner RISK (if non-independent review) and later Human Gate, protected merge, postmerge verify and terminal Lock release. All pending; no automatic approval inheritance.

**Checkpoint:** clean main successor implementation staged for provider verification; not canonical, not approved, not merge eligible.
