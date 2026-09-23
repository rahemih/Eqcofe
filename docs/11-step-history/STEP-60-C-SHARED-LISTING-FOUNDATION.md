# Step 60-C — Shared Listing Foundation

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `a8fcb395055dd5e68ef6bc4ec04f6c5c7c063566`
- Step 60-A: `CANONICAL_COMPLETE`
- Step 60-B: `CANONICAL_COMPLETE`
- PR #261: `MERGED / CLOSED`
- Step 60-B Lock: `RELEASED`
- Agent freeze: `RELEASED`
- Stage 60-C: `IN_PROGRESS`
- Primary implementation agent: `A3 — Frontend / Storefront Engineering`
- Linear tracker: `HOS-16`

## Fresh Live Guard

Immediately before Stage 60-C registration:

- `main = a8fcb395055dd5e68ef6bc4ec04f6c5c7c063566`
- open PRs = `0`
- competing Step-60 writer = `NONE`
- predecessor terminal evidence = PR #261 comment `5791993245`
- A0-A10 resume authorization = PR #261 comment `5792067040`

No pre-#261 artifact binding, Lock or Head is reused for this Stage.

## Scope

Stage 60-C creates only the reusable Storefront foundation needed by later Search and Category stages:

- generated-OpenAPI-derived ProductCard/listing response types;
- deterministic URL state for the currently supported `q`, `cursor` and `limit` dimensions;
- opaque cursor preservation and stale-cursor reset rules;
- shared ProductCard and grid presentation primitives;
- Persian/RTL/responsive/accessibility-safe listing styles;
- a deterministic Stage-C verifier integrated into Storefront verification.

## Explicit boundary

This Stage does **not**:

- productionize `/search?q=` — owned by 60-D;
- productionize `/category/:slug` — owned by 60-E;
- implement advanced filters, selectable sorting or pagination controls — owned by 60-F;
- mutate Backend, OpenAPI, database, pricing or inventory authority;
- invent parallel business DTOs;
- implement Product Detail, Compare/Wishlist, Cart/Checkout or Admin behavior;
- update Roadmap or Current State; final reconciliation remains 60-I.

## Contract authority

`src/generated/openapi.ts` remains the only Storefront business-contract type authority. Stage 60-C may create aliases/projections for presentation, but may not redefine ProductCard, price, availability, pagination or search response truth.

The public cursor is treated as an opaque backend token. The Storefront may carry it through the URL but never decode or reinterpret its ranking/keyset semantics.

## Provider event recovery

The first PR #262 provider event was created before the PR body contained the mandatory explicit Task Contract path. Its Canonical CI / Phase A failures were therefore governance-context failures (`PR_TASK_CONTRACT_REFERENCE_REQUIRED`), not implementation-test failures. The PR body was corrected to reference the exact Stage 60-C Task Contract. This amendment intentionally creates a fresh Head so subsequent provider runs consume a fresh pull-request event; all earlier exact-artifact evidence is stale and must not be reused.

## Definition of Done

- Task Contract registered from exact canonical base;
- no overlapping ACTIVE Lock or competing writer;
- generated types are reused rather than copied;
- q/cursor/limit URL state is deterministic and fail-closed;
- stale cursor resets when result-set dimensions change;
- shared ProductCard/List primitives render authoritative values only;
- Search and Category routes remain placeholders;
- no Stage-60-F filter/sort capability is introduced early;
- dedicated Stage-C verification is part of Storefront `verify`;
- full exact-head canonical gates pass;
- protected merge and exact-SHA postmerge verification pass;
- Stage-C Lock becomes terminally `RELEASED`;
- only then may 60-D begin.

## Current boundary

```text
STEP_60_A = CANONICAL_COMPLETE
STEP_60_B = CANONICAL_COMPLETE
STEP_60_C = IN_PROGRESS
STEP_60_D = BLOCKED_UNTIL_60_C_CANONICAL_COMPLETE
STEP_60_E_TO_I = NOT_STARTED
CLAIMED_CANONICAL_PASS = NO
```
