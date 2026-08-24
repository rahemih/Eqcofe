# Step 51 / A11 — Management Export Discovery / Contract Freeze

**Status:** COMPLETE / FINAL GATE PASS

## Scope decision
A11 freezes the management-export contract over the existing A4–A10 Analytics read models. It is evidence and design only: no migration, runtime code, dependency, permission, HTTP/OpenAPI operation, export artifact or business rule is added.

Finance reporting/export remains Finance-owned and unchanged. Step-51 exports are Analytics-owned snapshots of Analytics read models only; they must not query owner-domain tables directly or become a parallel reporting authority.

## Frozen export datasets
Each export job contains exactly one allow-listed dataset:

1. `sales_revenue_daily` — A4 daily sales/revenue points and aggregate metadata.
2. `profit_daily` — A5 daily revenue, COGS, operating cost, profit and margin points.
3. `inventory_snapshot` — A6 bounded variant stock-state snapshot.
4. `customer_lifetime` — A7 bounded pseudonymous customer lifetime rows.
5. `wholesale_applications` — A8 bounded wholesale application lifecycle rows.
6. `fulfillment_operations` — A10 order-fulfillment status/age/cycle/freshness rows.
7. `shipment_operations` — A10 shipment status/age/cycle/freshness rows.
8. `return_operations` — A10 return status/age/cycle/freshness rows.
9. `warranty_operations` — A10 warranty status/age/cycle/freshness rows.

An export may not combine datasets. Order/customer names, email, phone, address, free-text notes/reasons/descriptions, tracking provider payloads, secrets, internal audit payloads and raw owner-domain rows are excluded. Stable UUIDs already present in the read model may be exported only where required by that frozen dataset.

## Frozen format contract
- Supported formats: `csv` and `json` only.
- XLSX is not approved. The repository has a server-owned XLSX decoder and template description, but no canonical binary XLSX writer. A future XLSX writer requires its own dependency/security decision and formula/package tests.
- CSV is UTF-8 with a BOM, deterministic allow-listed column order, RFC-4180 quoting and CRLF records.
- Any CSV textual cell whose first non-whitespace character is `=`, `+`, `-` or `@` must be neutralized before serialization. Tabs/control characters and embedded CR/LF require safe normalization/quoting.
- JSON uses an explicit versioned envelope and allow-listed keys; it must not serialize arbitrary database objects.
- Filenames are server-generated ASCII-safe values containing dataset key, UTC generation timestamp and export identity. Client-supplied filenames are forbidden.
- MIME is fixed by format: `text/csv; charset=utf-8` or `application/json; charset=utf-8`.

## Frozen bounds and snapshot semantics
- Exactly one dataset per job.
- Row limit: integer `1..500`; default `500`.
- Sales/profit date range: valid calendar dates, ordered, maximum 366 inclusive days.
- Operational date range: explicit `from`, `to` and `as_of`; ordered, maximum 366 days, and `to <= as_of`.
- Inventory, Customer and Wholesale use their existing deterministic 1–500 limits.
- Generation must call the existing A4–A10 management services, not duplicate calculations or query authoritative owner schemas.
- The artifact records request parameters, generated-at UTC, maximum source watermark and row count so freshness is explicit.
- Generation fails closed if read-model validation, safe-integer checks, serialization, row bounds or a 5 MiB encoded-content ceiling fails.
- Empty datasets produce a valid header/envelope with zero rows; they must not fabricate activity.

## Frozen job and persistence lifecycle for A12
Analytics may add forward-only persistence for `analytics.management_exports` with:

- server UUID, dataset key, format and normalized parameters;
- status `queued | running | completed | failed`;
- actor identity, idempotency identity and request/trace evidence;
- row count, source watermark, filename, MIME, content hash and bounded text content;
- created/started/completed timestamps and safe failure code.

Only terminal `completed` or `failed` transitions are allowed from processing. Completed content and terminal metadata are immutable; replay of the same actor/idempotency key returns the same job and cannot regenerate a second artifact. No automatic deletion/retention rule is invented in Step 51; changing retention requires an explicit data-governance decision. Artifact content may never be written to central audit logs.

## Frozen authorization, audit and delivery
A12 may add exactly these additive permissions:

- `analytics.export.create` — high risk;
- `analytics.export.view` — medium risk;
- `analytics.export.download` — high risk.

All future routes are Staff-only. Creation requires `analytics.export.create`, Step-Up and idempotency. Listing/status requires `analytics.export.view`. Download requires `analytics.export.download` and Step-Up on every request.

Create, terminal transition and every download attempt must write central audit metadata containing only export identity, dataset, format, actor, row count, source watermark, content hash/outcome and request/trace identity. Audit must not contain rows or artifact content.

Delivery is authenticated direct response only. Public/signed links, email delivery, cloud upload, attachment forwarding and cross-user sharing are not approved. Response headers must prevent MIME sniffing and caching of sensitive content and must use a server-generated attachment filename.

## Existing implementation audit
- Finance already has Finance-owned CSV/JSON report jobs and exports. Its persistence and `finance.export` permission cannot be reused as Analytics ownership.
- The current Finance CSV helper quotes delimiters but does not prove spreadsheet-formula neutralization; A12 must not copy it without hardening.
- Step 50 provides a safe XLSX decoder and a template model, not a management-export XLSX writer.
- A4–A10 already enforce the required date/row/safe-integer/read-side bounds and are the mandatory generation sources.
- Analytics currently has no HTTP controller, export permission or export persistence, so no conflicting Step-51 surface exists.

## A12 acceptance gate
A12 is approved as **Management Export Jobs + Safe Serialization** only within this freeze. It must include forward-only persistence, three permissions, idempotent job creation, immutable terminal artifacts, allow-listed serializers, CSV-injection tests, bounded-content tests, audit tests and direct-download application behavior.

HTTP controller/OpenAPI exposure remains deferred to a separate hardened slice after the A12 application/persistence boundary exists. Any XLSX support, multi-dataset workbook, public link, external delivery or retention deletion requires a new decision.

## Verification
- Canonical discovery baseline: `5df2b32ac9fafc5b2a3e7628f62fca83d5e53331`.
- A10 implementation and final evidence are present on canonical `main`.
- Linear issue `HOS-9` remains `In Progress` and aligned through A10.
- Documentation diff check: PASS.

## Next
Proceed to Step 51 / A12 — Management Export Jobs + Safe Serialization, strictly within this frozen contract.
