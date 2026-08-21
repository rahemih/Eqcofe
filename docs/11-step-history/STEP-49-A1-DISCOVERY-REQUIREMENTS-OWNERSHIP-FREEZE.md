# EQCOFE Step 49 / A1 — Discovery / Requirements / Ownership Freeze

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A1 — Discovery / Requirements / Ownership Freeze  
**Date:** 2026-08-21  
**Status:** COMPLETE / awaiting canonical CI + merge

## Canonical starting point

- Repository: `rahemih/Eqcofe`
- Branch: `main`
- Step-48 closure baseline: `149d5ec440fc789376ade48553b67f636a571f6d`
- Roadmap scope: barcode/SKU physical sales, shared inventory consumption, reserve rules, offline/sync strategy, reconciliation, RBAC and audit controls.

## Discovery findings

1. There is no existing canonical `src/modules/pos` bounded context or POS implementation on `main`.
2. Inventory is already an established authoritative bounded context with application/domain/infrastructure/presentation layers and must remain the owner of stock truth and stock mutation invariants.
3. Catalog remains authoritative for Product/Variant/SKU identity and product facts.
4. Pricing remains authoritative for sell price and pricing rules; POS must not create an independent price source.
5. Orders/Payments/Finance/Fulfillment remain authoritative for their own existing lifecycles and must not be silently bypassed by POS implementation.
6. Configuration remains the owner of central operational policy values where a Step-49 policy is genuinely configurable.
7. Existing audit/idempotency/RBAC conventions must be reused; Step 49 must not introduce parallel authorization or audit systems.

## Frozen ownership boundary

### POS owns
- physical-sale/session orchestration;
- barcode/SKU scan workflow and POS line state;
- physical-sale transaction identity and idempotent command orchestration;
- offline command envelope/synchronization state that is specific to POS;
- reconciliation state for POS-originated commands/transactions;
- POS-facing operational read models that do not become authoritative copies of Catalog/Pricing/Inventory/Payments/Finance data.

### Catalog owns
- product/variant/SKU identity and lookup facts;
- SKU validity and product lifecycle facts.

POS must reference Catalog identity; it must not persist a second editable Catalog.

### Pricing owns
- authoritative Toman prices and pricing rules.

POS may request/record immutable sale snapshots needed for historical transaction evidence, but it must not become the mutable price authority.

### Inventory owns
- physical stock truth;
- warehouse/stock availability;
- reservations/allocations/consumption;
- cost/FIFO lineage;
- concurrency-safe stock mutation.

POS must consume stock through Inventory-owned contracts/transactions and must never decrement an independent POS stock counter.

### Orders / Payments / Finance
- existing authoritative lifecycle ownership remains unchanged;
- Step 49 may add explicitly defined physical-sale integration boundaries only when required by later substeps;
- no POS shortcut may fabricate paid/refunded/financial outcomes.

## Shared inventory / reserve rule freeze

- Physical and online commerce must share the same authoritative Inventory state.
- The physical-store protection/reserve policy must be enforced at the Inventory/availability policy boundary, not by maintaining separate physical and online stock databases.
- Reserve semantics must be deterministic, fail closed and concurrency-safe.
- No Step-49 implementation may make online available stock negative or permit physical sale to consume unavailable stock.
- Any exception policy for wholesale or other channels must come from an already-canonical business/configuration rule; A1 does not invent one.

## Barcode / SKU boundary

- Scanner input is untrusted text and must be normalized/bounded before lookup.
- A barcode is a lookup key, not a product authority.
- Mapping must converge to a canonical Catalog variant/SKU identity.
- Duplicate/malformed/ambiguous mappings must fail closed.
- A1 does not prescribe barcode format or vendor hardware protocol; those are deferred until implementation evidence requires them.

## Offline / sync boundary

Offline capability is limited to POS-originated command capture/synchronization. It is not permission to maintain an independent authoritative store database.

Frozen invariants:
- every offline command requires a stable client command/idempotency identity;
- replay must be safe and deterministic;
- server reconciliation is authoritative;
- stale offline price/stock facts cannot override current server-side business rules without an explicit future rule;
- conflicts must be observable and reconcilable rather than silently overwritten;
- secrets and privileged credentials must not be embedded in offline payloads.

## Reconciliation boundary

Reconciliation must be explicit and append/audit oriented. It must distinguish at least:
- accepted/applied commands;
- idempotent replays;
- rejected business-rule conflicts;
- unavailable/stale stock or price conflicts;
- manual-review state when deterministic automatic resolution is unsafe.

A1 does not authorize destructive history rewriting during reconciliation.

## Security / RBAC freeze

- POS operational writes require authenticated staff context and dedicated least-privilege RBAC permissions.
- Sensitive administrative/reconciliation overrides must follow existing Step-Up/idempotency conventions when risk requires them.
- POS cannot grant permissions, read secrets, bypass Inventory/Pricing/Payments ownership or invoke unrelated Admin mutations.
- Client/offline payloads are untrusted input and never confer server authorization.

## Data / API / migration rules

- New persistence, if required by later substeps, must use forward-only migrations.
- Existing migrations are immutable.
- New HTTP endpoints must use canonical validation, authentication, RBAC, error and idempotency conventions and update OpenAPI.
- POS may persist its own transaction/sync/reconciliation records, but not mutable duplicate Catalog/Pricing/Inventory authorities.

## Frozen Step-49 execution sequence

- **A1** — Discovery / Requirements / Ownership Freeze
- **A2** — POS Domain + Physical Sale Transaction Model
- **A3** — Barcode / SKU Resolution Boundary
- **A4** — Shared Inventory Consumption + Physical/Online Reserve Enforcement
- **A5** — POS Pricing / Commercial Snapshot Boundary
- **A6** — Physical Sale Commit / Payment-Finance Integration Boundary
- **A7** — Offline Command Queue + Idempotent Sync
- **A8** — Reconciliation + Conflict / Recovery Controls
- **A9** — POS RBAC / Admin Operations / Audit + API Contract
- **A10** — Security / Concurrency / E2E Regression Gate
- **A11** — Final Canonical Closure

This sequence is an implementation decomposition of the exact Step-49 roadmap scope; it adds no unrelated product scope.

## Explicitly out of scope for Step 49

- POS frontend/UI design (later UI phases);
- hardware-vendor-specific scanner/payment terminal SDK integration unless separately required by canonical scope;
- separate inventory database for store sales;
- independent POS pricing authority;
- arbitrary offline overwrite of server state;
- new loyalty/marketing/wholesale business rules;
- general refactors or dependency upgrades;
- Excel management (Step 50);
- analytics platform work (Step 51).

## A1 completion rule

A1 becomes canonical COMPLETE only when this freeze and current-state synchronization pass Canonical CI on their exact PR head and are merged to `main`.

## Next safe action after A1 closure

Proceed to **Step 49 / A2 — POS Domain + Physical Sale Transaction Model**.