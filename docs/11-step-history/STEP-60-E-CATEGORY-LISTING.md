# Step 60-E — Production Category Listing

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `d06885c26a77ab3db7f23356ac973db2019164c3`
- Step 60-A: `CANONICAL_COMPLETE`
- Step 60-B: `CANONICAL_COMPLETE`
- Step 60-C: `CANONICAL_COMPLETE`
- Step 60-D: `CANONICAL_COMPLETE`
- Step 60-D terminal evidence: PR #263 comment `5793034284`
- Stage 60-E: `IN_PROGRESS`
- Task: `EQCOFE-STEP60-E-CATEGORY-LISTING-001`
- Primary implementation agent: `A3 — Frontend / Storefront Engineering`
- Linear tracker: `HOS-16`

## Fresh Live Guard

Immediately before Stage 60-E registration:

- `main = d06885c26a77ab3db7f23356ac973db2019164c3`
- open PRs = `0`
- competing Step-60 writer = `NONE`
- Step 60-D Lock = `RELEASED`
- Step 60-E branch before registration = `ABSENT`

No Stage 60-D artifact-bound evidence is reused as Stage 60-E evidence.

## Scope

Stage 60-E productionizes only `/category/:slug`:

- consumes authoritative `GET /categories/{slug}` category context;
- consumes authoritative `GET /categories/{slug}/products`;
- accepts only collection `cursor/limit` URL state from the Stage 60-C foundation;
- preserves backend product order and opaque cursor bytes;
- reuses the shared ListingGrid/ProductCard primitives;
- renders invalid-query, category-not-found, no-result, error and bounded manual-recovery states;
- preserves validated category slug plus cursor/limit in retry URLs;
- verifies SSR against controlled API fixtures.

## Explicit boundary

This Stage does **not**:

- consume `GET /categories/{slug}/filters`;
- expose the contract's optional `brand` query filter;
- introduce filter controls, selectable sorting, pagination or infinite-loading controls — all reserved for 60-F;
- mutate Backend/OpenAPI/database;
- create frontend price, inventory, category or ranking authority;
- implement Product Detail, Compare/Wishlist, Cart/Checkout or Admin behavior;
- perform final listing SEO/accessibility/browser hardening beyond the Stage-specific safe baseline — 60-G;
- update final Roadmap/CURRENT-STATE closure — 60-I.

## Authority

Generated OpenAPI remains the category context and listing type authority. The Category route may display authoritative category fields and product cards only. The frontend does not infer hierarchy, filter definitions, ranking, stock or commercial rules.

## Definition of Done

- Task Contract registered from exact canonical base;
- missing slug/invalid query makes zero category backend requests;
- valid category uses context + product listing contracts only;
- no `/filters` request occurs;
- no `brand`, sort or pagination control is introduced;
- authoritative ready/no-result/not-found/recovery states are verified;
- shared ListingGrid/ProductCard is reused;
- historical Category-placeholder verifiers transition without weakening Search or Step61+ boundaries;
- dedicated Stage-E verifier is integrated into Storefront `verify`;
- exact-head canonical gates pass;
- exact-artifact Lock is ACTIVE before protected merge;
- protected merge + exact-SHA postmerge verify pass;
- terminal Lock is RELEASED;
- only then may 60-F begin.

```text
STEP_60_A = CANONICAL_COMPLETE
STEP_60_B = CANONICAL_COMPLETE
STEP_60_C = CANONICAL_COMPLETE
STEP_60_D = CANONICAL_COMPLETE
STEP_60_E = IN_PROGRESS
STEP_60_F = BLOCKED_UNTIL_60_E_CANONICAL_COMPLETE
STEP_60_G_TO_I = NOT_STARTED
CLAIMED_CANONICAL_PASS = NO
```
