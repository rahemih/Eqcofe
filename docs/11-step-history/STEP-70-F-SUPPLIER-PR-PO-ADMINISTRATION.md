# EQCOFE — Step 70-F Supplier / Purchase Request / Purchase Order Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `5d2dbd3acdde3c993253e30391cf3701b3c84ba8`  
Linear: `HOS-74`  
Risk: **HIGH**  
Human Gate: **REQUIRED_FINAL_EXACT_ARTIFACT**

## Entry proof

Step70-E is terminally canonical through PR #385 on `main@5d2dbd3acdde3c993253e30391cf3701b3c84ba8`. Exact-head and exact-merge Canonical CI / Phase A / CodeQL passed; terminal Scope Lock release is PR comment `6440192366`.

## Frozen scope

70-F owns exactly:

- AD-D-12 Supplier administration — 6 operations;
- AD-D-13 Purchase Request administration — 8 operations;
- AD-D-14 Purchase Order administration — 9 operations.

Total: **23 source-backed operations**.

Goods Receipt/reversal, landed cost, Supplier Invoice/dispute and Purchase Return remain 70-G. POS remains 70-H.

## Read authority

- `GET /admin/procurement/suppliers`
- `GET /admin/procurement/suppliers/{id}`
- `GET /admin/procurement/purchase-requests`
- `GET /admin/procurement/purchase-requests/{id}`
- `GET /admin/procurement/purchase-orders`
- `GET /admin/procurement/purchase-orders/{id}`

The Admin route does not invent list/detail response shapes. It reports canonical endpoint, HTTP status and request-id only.

## Idempotent create authority

Exactly three runtime-required create operations receive a fresh server-owned Idempotency-Key:

- `POST /admin/procurement/suppliers`
- `POST /admin/procurement/purchase-requests`
- `POST /admin/procurement/purchase-orders`

Browser code cannot provide or reuse these keys.

## Version/concurrency authority

All update and lifecycle transitions use the explicit current entity version through `If-Match`. Conflict / precondition failures are fail-closed and never overwrite.

Supplier:
- PATCH update;
- POST activate;
- POST deactivate.

Purchase Request:
- PATCH update;
- POST submit;
- POST approve;
- POST reject;
- POST cancel.

Purchase Order:
- PATCH update;
- POST submit;
- POST approve;
- POST send;
- POST cancel;
- POST close.

## Step-Up and separation of duties

WebAuthn Step-Up is required only where runtime declares it:

- PR approve;
- PR reject;
- PO approve.

No Step-Up is invented for other transitions. Backend remains authority for separation-of-duties: a requester cannot approve the same PR and a PO creator cannot approve that same PO.

## Business invariants preserved

Supplier:
- code and Persian name required on create;
- payment terms are a nonnegative integer;
- update requires at least one change;
- delete is not invented.

Purchase Request:
- warehouse scope remains Backend authority;
- at least one unique variant item;
- requested quantity is a positive integer;
- PR approve requires submitted state;
- reject/cancel require a reason;
- approved PR may be converted by PO creation only through Backend authority.

Purchase Order:
- supplier must be active;
- optional PR must be approved and warehouse-matched;
- items are non-empty and variant-unique;
- quantities are positive integers;
- money is integer nonnegative Toman;
- discount cannot exceed line subtotal;
- approve is submitted-only;
- send is approved-only;
- cancel/close rules remain Backend authority.

## Source-proven controller drift repair

Canonical OpenAPI defines PO close body as `ResolveRequest { resolution_note }`. Runtime controller previously forwarded only `b.reason ?? b.note`, so the canonical field could be dropped before `PurchaseService.transitionOrder`.

70-F makes one narrow runtime correction:

`resolution_note ?? reason ?? note`

No state machine, database, OpenAPI, generated type or event semantics change.

## Deliberate non-feature

Canonical PR item schemas contain optional `suggested_quantity`, but current runtime service/repository has no persistence or behavior authority for it. 70-F does not pretend this field works: the Admin validator rejects it instead of silently discarding operator input.

## Unknown outcome rule

Network, timeout, abort, HTTP 408 and 5xx after any mutation are treated as **unknown outcome**. No automatic replay occurs. The operator must re-read the authoritative Supplier/PR/PO state before issuing a new command.

## Explicit non-authority

70-F does not mutate:
- Goods Receipt, landed cost, Supplier Invoice or Purchase Return;
- Inventory or POS;
- database schema;
- Storefront;
- Current State / Master Roadmap;
- Step71;
- Graph/Graphify.

## Exit gate

70-G remains blocked until exact-head Canonical CI / Phase A / CodeQL, deterministic Review, independent Security, exact-artifact ACTIVE Lock and explicit Project Owner Human Gate pass; then protected merge, exact-SHA postmerge verification and terminal Lock RELEASE must complete.

Until then:

```text
STEP_70_F = IN_PROGRESS / NOT_CANONICAL
STEP_70_G = BLOCKED_FROM_MUTATION
```


## Recovered Step56/57 provenance repair

The authorized one-line PO-close controller compatibility correction changes a source file that Step56 recovered evidence hashes fail-closed.

70-F therefore propagates only canonical SHA256 provenance through the same explicit 17-file Step56/57 evidence chain used by the established recovery pattern:

- source hash in Step56-A Admin UX contract;
- A-G contract/manifest source-hash links;
- Step56 final-audit and its manifest;
- Step57 high-fidelity source-linked hashes.

No screen, frame, journey, operation ownership, permission mapping, visual semantics, review status, approval state or historical verdict is changed. Historical source-audit files and Current State remain untouched.
