# EQCOFE Step 70-G B1 — canonical reason fields for procurement transitions

Status: **IN_PROGRESS / HIGH-RISK / NOT_CANONICAL**.

Source baseline: `main@946ccb63ed210305b0ced2fb12143944ff37b796`. Task: `EQCOFE-STEP70-G-B1-BACKEND-REASON-ALIAS-001`; issue [#388](https://github.com/rahemih/Eqcofe/issues/388), successor Admin [PR #387](https://github.com/rahemih/Eqcofe/pull/387), Linear `HOS-74`.

## Immutable scope

1. `POST /admin/procurement/goods-receipts/{id}/reverse`: controller must forward the canonical optional OpenAPI `ApproveRequest.comment` as reason, then legacy `reason`, then `note`, without touching `@RequireStepUp`, `@RequireIdempotency`, `If-Match`, authorization or service state transition. Backend already requires non-empty reason at reversal.
2. `POST /admin/procurement/supplier-invoices/{id}/dispute` and `cancel`: controller must forward required OpenAPI `ResolveRequest.resolution_note`, then legacy `reason`, then `note`. Preserve version and current domain state transitions.
3. Controller source SHA mutation must be propagated through exactly the 17 authorized generated Step56/57 source provenance JSON/manifest files; NO design semantics, status, wireframe, screenshots or historical conclusions change.

## Explicit exclusions

Landed Cost preview/finalize, contract `preview_id`, warehouse scope verification, allocation weight, independent finance lifecycle, inventory/returns service changes, new endpoints, Graph, Step70-H and Step71 are outside B1. They remain blocked in GitHub issue #388 and must be independently authorized. PR #387 must not claim B1 authority until this backend change is merged/postmerge verified.

## Verification requirements

Direct unit tests must prove `comment` and `resolution_note` mapping and negative/fallback cases. `pnpm verify` including full design source-hash checks, Phase A, exact-head CodeQL, deterministic Review, independent Security, ACTIVE Lock and explicit Owner Human Gate are required before protected merge. Then exact-SHA postmerge and terminal Lock RELEASED.
