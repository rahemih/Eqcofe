# Step 60-B — Backend/OpenAPI Listing Contract Readiness

## Current status

- Canonical base: `4a9b1e921561eb09b22a44acf2aff05147144b15`
- Step 60-A: `CANONICAL_COMPLETE`
- Agent Layer A0–A10: `CANONICAL_COMPLETE`
- Step 60-B PR: `#261`
- Risk: `HIGH` — required by the unchanged Inventory sensitive-zone classifier.
- Human Gate: `REQUIRED` — explicit Project Owner approval of the final exact artifact.
- Current lifecycle state: `REPAIR_COMPLETE_CANDIDATE / EXACT_HEAD_VERIFICATION_PENDING`
- No Step 60-C mutation is authorized before 60-B protected merge, exact-SHA postmerge verification and terminal Lock release.

## Risk declaration alignment

Merge Policy run `35641866958` classified exact head `432302fc42573dd86202edfe874c1f8dc65720fe` as HIGH because the authorized scope includes Inventory public-port/service/repository changes. The prior MEDIUM declaration and disabled Human Gate were inconsistent with that provider result. The Task Contract and generated Task Catalog now require the existing HIGH-risk Security and Human gates. This correction preserves write/forbidden scope and does not change runtime code, controllers, workflows or historical design evidence. No Human Approval is claimed by this amendment.

## Agent ownership

- A0 — Orchestrator: live guard, recovery, serialization and canonical handoff.
- A1 — Specification & Research: contract/gap/dependency analysis and acceptance criteria.
- A2 — Backend: public listing/search contract, cursor behavior, Catalog/Inventory public integration and OpenAPI.
- A5 — Database & Data: read-only query/index review; no migration was authorized because no correctness migration blocker was proven.
- A3 — Storefront: blocked until Stage 60-C.
- A7 — QA: negative, cursor, boundary, batching and regression coverage.
- A8 — Security: public input bounding, fail-closed validation and injection/abuse review.
- A10 — Evidence: provider-backed facts only; no synthetic PASS.

## Problems confirmed by live audit

Stage 60-A recorded untyped successful response contracts for Search/Category discovery endpoints. Step 60-B recovery additionally proved:

- `GET /products` advertised `min_price`, `max_price`, `available` and `sort` that the backend did not implement.
- `GET /search` implemented `q + cursor + limit` but OpenAPI described only `q` and had no typed success body.
- `GET /search/suggestions`, category products and category filters lacked complete typed success contracts.
- `GET /brands/{slug}/products` used the shared listing backend but had an untyped success body and no cursor/limit/category contract.
- ProductCard `availability.in_stock` was fabricated as `false`.
- The original cursor encoded only `created_at` while listing ordered by `created_at DESC, id DESC`; Search additionally ordered by relevance rank. Equal-timestamp boundary rows could therefore be skipped.
- Explicit invalid public `limit` values silently fell back instead of failing closed.
- Inventory availability was optional in Catalog wiring and the initial repair used per-product/per-variant reads.

## Canonical decisions implemented in this Stage

1. Source OpenAPI defines typed successful responses for Search, Category products, Brand products, Category filters, Category context and Search suggestions.
2. False public capabilities are not advertised: advanced selectable sort, min/max price filtering, availability filtering and attribute-value product filtering remain Stage 60-F.
3. `GET /products` remains backend-owned newest ordering.
4. Search remains backend-owned relevance ordering.
5. Listing keyset cursor binds `created_at + id` and the active category/brand scope.
6. Search keyset cursor binds `rank + created_at + id` and the active search query.
7. Malformed, mismatched, empty or oversized cursors fail closed; cursor input is bounded before base64 decoding.
8. Explicit public limits must be safe integers within their endpoint contract. Only an absent limit receives the documented default.
9. Public category/brand query scopes enforce canonical Slug syntax and length.
10. Category/brand scoped routes reject attempts to override their path-owned scope with undeclared query keys.
11. ProductCard uses canonical `BrandRef`, `CategoryRef`, `MediaRef`, nullable authoritative `PriceView` and `AvailabilityView`.
12. Inventory authority is mandatory for public ProductCard stock truth; missing wiring is not silently converted into `in_stock=false`.
13. Availability is bounded to one Catalog sellable-variant batch read plus one Inventory availability batch read per public page.
14. Catalog does not import Inventory repositories; it consumes the public Inventory port.
15. Category filter responses normalize absent aggregate values to an empty array.
16. Undeclared public listing/search query keys fail closed.
17. `src/generated/openapi.ts` is required to be byte-for-byte reproducible from `contracts/http/openapi.yaml` via the canonical `openapi-typescript` generator.

## Database/Data disposition

A5 found no correctness migration requirement for Stage 60-B. Existing structures can execute the repaired queries.

Performance candidates remain for later measured hardening, particularly:
- a composite public keyset-order index including the tie-breaker id;
- a variant-led stock-balance lookup index for large inventory datasets.

These are **not** claimed as implemented. Step 60-G may introduce them only if acceptance measurements justify a migration.

## Provenance synchronization

The Step56/57 validators correctly failed closed when intentionally changed runtime/OpenAPI sources made historical source hashes stale. Validators were not weakened or bypassed.

The active Task Contract was expanded before provenance repair. The deterministic cascade was then synchronized through:

```text
Step56-A recovered-source evidence
→ Step56-B source hash + manifest
→ Step56-C source hash + manifest
→ Step56-D source hash + manifest
→ Step56-E source hash + manifest
→ Step56-F source hash + manifest
→ Step56-G source hash + manifest
→ Step56-H audit sources/manifests + H manifest
→ Step57 foundation source hashes
```

Only provenance/hash facts were changed in those design artifacts. Historical transport evidence, screen/state/journey/permission semantics, design scope, review approvals and runtime-release claims were not rewritten. Step57 remains `IN_PROGRESS` with all closure review fields `PENDING`.

## Stage boundary

This Stage **does** include the minimum backend correctness changes required for listing readiness:
- Catalog application/query and repository changes;
- Catalog public controller routing changes;
- Inventory public port/service/repository batch-read changes;
- OpenAPI and generated type changes;
- tests and provenance evidence synchronization.

This Stage does **not** include:
- Search/Category Storefront UI;
- URL-state UI;
- filter/sort controls;
- price/availability/attribute filtering implementation;
- database migrations;
- Pricing domain/rule changes;
- Inventory domain or presentation changes;
- Step 61+ behavior.

## Verification required before canonical completion

### Security provider selection

The Owner authorized replacing the unavailable Strix path. The scoped Task Contract now names GitHub-managed CodeQL Extended analysis as the external security evidence source. This adds explicit current-PR provenance, coverage and alert acceptance requirements; it does not weaken the HIGH risk floor, Human Gate, protected merge transport or existing checks. Executor/A8 opinions cannot replace the provider result.

The initial CodeQL setup run `35730979098` analyzed canonical main `4a9b1e921561eb09b22a44acf2aff05147144b15` and produced 15 baseline alerts. It is not an exact-PR Security PASS. Baseline findings remain open for triage; no alert dismissal or repository-wide security assurance is claimed. The fresh PR version must receive its own CodeQL analysis and all existing required verification before finalization.

60-B may be declared canonical only after all of the following are provider-backed on one exact Head:

- Canonical CI = PASS;
- Phase A = PASS;
- Step57 verification = PASS;
- Step58 Storefront Quality = PASS;
- A7 deterministic regression review = PASS;
- A8 security review, when required by the active scope, has no unresolved blocker;
- deterministic primary Review = PASS;
- exact-artifact Lock = ACTIVE;
- Merge Policy = PASS with blockers `[]`;
- Fresh PRE_DISPATCH_GUARD = PASS;
- protected workflow_dispatch merge;
- exact-SHA postmerge `pnpm verify` = PASS;
- exact-SHA postmerge Phase A = PASS;
- A10 terminal evidence recorded;
- Lock = `RELEASED`.

Until those facts exist:

```text
STEP_60_B = IN_PROGRESS
CLAIMED_CANONICAL_PASS = NO
STEP_60_C_MUTATION = PROHIBITED
```
