# EQCOFE — Step 70-E Inventory Flow Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `acbb8e35a29bdffec27d1ea9d7ce12ea4c402a01`  
Linear: `HOS-74`  
Risk: **HIGH**  
Human Gate: **REQUIRED_FINAL_EXACT_ARTIFACT**

## Entry proof

Step70-D is terminally canonical through PR #384 on `main@acbb8e35a29bdffec27d1ea9d7ce12ea4c402a01`. Exact-head and postmerge Canonical CI / Phase A / CodeQL passed and terminal Lock release is comment `6437551035`.

## Scope

70-E owns only:

- AD-D-08 transfer administration;
- AD-D-09 reservation / payment-state administration;
- AD-D-10 allocation / pick / unpick / release / sale-consumption administration.

Inventory adjustment and warehouse protection are already closed in 70-D. Procurement remains 70-F/70-G. POS remains 70-H.

## Canonical contract drift correction

During exact-head typecheck, Stage70-E proved a pre-existing authority mismatch for `POST /admin/inventory/reservations/{id}/late-payment-review`:

- runtime controller: `@RequireIdempotency('inventory.convert')`;
- canonical OpenAPI before repair: only path `id`, no `Idempotency-Key`;
- generated TypeScript before repair: `header?: never`.

70-E therefore authorizes a minimal contract-only correction:

- add the canonical `IdempotencyKey` parameter to that single OpenAPI operation;
- regenerate/synchronize `src/generated/openapi.ts`;
- no runtime/database behavior change.

This prevents the Admin UI from bypassing generated authority and restores canonical parity with existing runtime security semantics.

## Canonical reads

- `GET /admin/inventory/transfers`
- `GET /admin/inventory/transfers/{id}`
- `GET /admin/inventory/reservations`
- `GET /admin/inventory/reservations/{id}`
- `GET /admin/inventory/allocations`

Canonical generated response bodies for these GETs remain untyped. 70-E does not bypass that contract by parsing guessed JSON. The UI proves endpoint/status/request-id only.

## Idempotent mutations

Server-owned fresh idempotency keys are required for:

- `POST /admin/inventory/transfers`
- `POST /admin/inventory/transfers/{id}/ship`
- `POST /admin/inventory/transfers/{id}/receive`
- `POST /admin/inventory/reservations`
- `POST /admin/inventory/reservations/{id}/late-payment-review`
- `POST /admin/inventory/reservations/{id}/convert`
- `POST /admin/inventory/allocations`
- `POST /admin/inventory/consume-sale`

The browser never selects or edits an idempotency key.

## Non-idempotent canonical transitions

No idempotency is invented for:

- transfer approve / cancel;
- reservation begin-payment / release / release-commitment / expire;
- allocation pick / unpick / release.

Unknown network/timeout/aborted/5xx outcomes never auto-retry. The operator must re-read authoritative flow state before starting another action.

## Transfer invariants

- source and destination warehouse IDs differ;
- at least one item is required;
- each variant appears once;
- quantity is a positive integer;
- approve checks source physical availability;
- ship consumes source FIFO cost layers;
- receive recreates destination FIFO ancestry;
- only draft/approved transfers can be cancelled.

## Reservation invariants

- expiry is a valid future datetime;
- payment grace, when present, is not before expiry;
- warehouse+variant pairs are unique;
- quantities are positive integers;
- online sellable stock remains Backend authority;
- late-payment review may reclaim released stock only when source authority permits;
- converted reservation commitment release must stay stock-balance consistent.

## Allocation / sale invariants

- order-item, warehouse and variant IDs are UUIDs;
- quantity is a positive integer;
- reservation ID is optional UUID;
- reservation-backed allocation cannot exceed remaining converted commitment;
- pick: allocated -> picked only;
- unpick: picked -> allocated only;
- shipped allocation cannot be released;
- sale consumption requires picked allocation and preserves FIFO/COGS before shipped state.

## Explicit non-authority

70-E does not:

- adjust inventory;
- change warehouse protection;
- create/archive/delete warehouse;
- mutate Supplier / Purchase Request / Purchase Order / Goods Receipt / landed cost / Supplier Invoice / Purchase Return;
- mutate POS;
- mutate Backend runtime, database, Storefront, Product Design or Current-State;\n- mutate any OpenAPI/generated surface except the single source-proven late-payment-review Idempotency-Key correction;
- begin Step71;
- resurrect Graph/Graphify.

## Exit gate

70-F is blocked until:

1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. exact-head CodeQL PASS;
4. deterministic Review PASS;
5. Independent Security PASS for exact Head/Artifact;
6. exact-artifact ACTIVE Scope Lock;
7. explicit Project Owner Human Gate for exact Head/Artifact;
8. protected merge;
9. exact-SHA postmerge Canonical CI / Phase A / CodeQL PASS;
10. terminal Lock RELEASE;
11. Linear records `STEP_70_E = CANONICAL_COMPLETE`.

Until then:

```text
STEP_70_E = IN_PROGRESS / NOT_CANONICAL
STEP_70_F = BLOCKED_FROM_MUTATION
```


## Recovered Step56/57 provenance repair

Canonical CI #2205 and Phase A #1704 failed closed after the authorized late-payment-review OpenAPI correction with `Recovered source changed: contracts/http/openapi.yaml`.

70-E follows the canonical repair pattern already used by Step65-B / PR #331:

- refresh only changed recovered-source SHA256 evidence;
- propagate source hashes through Step56 A-G contracts and generated manifest `sourceSha256` links;
- synchronize Step56-H final-audit provenance hashes and audit manifest;
- refresh Step57 high-fidelity source-linked hashes only as required;
- preserve every design screen, frame, journey, operation ownership, permission disposition, review state and historical verdict.

Exactly 17 Product Design provenance files are allowlisted in the Task Contract. All other Product Design paths remain unauthorized by omission. This is provenance-only and does not constitute a Product Design semantic change.
