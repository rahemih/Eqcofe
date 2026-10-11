# EQCOFE — Step 66-C Content/SEO Storefront Foundation & Article Listing

## Current verdict

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `3103976a9d17edc89d4aeca9517f2a5af5cf8e21`  
Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP66-C-CONTENT-FOUNDATION-001.json`  
Linear: `HOS-70`

## Goal

Productionize only SF-F-01 `/articles` on top of the typed public Article contract made canonical in 66-B. This stage establishes a shared Content read foundation for Storefront work while keeping Article detail/related SEO/structured data/sitemap/robots for 66-D.

## Authority

- `GET /articles` is the sole listing authority.
- Public lifecycle filtering remains backend-owned; Storefront never infers published state.
- Generated OpenAPI is the only response-type authority.
- Cursor is opaque. Storefront bounds its URL length but never decodes or rewrites it.
- No frontend sort/filter/ranking, draft/admin controls, or browser-local content truth.
- No legal/support/archive/stop-sale content is introduced here.

## Implementation scope

- generated-contract Article list types;
- server-only Article list loader with fixed bounded page size and recoverable states;
- production Persian RTL Article list view;
- responsive/accessibility styling;
- deterministic 66-C verifier;
- minimal Step59 handoff reconciliation for the productionized `/articles` route;
- inherited verification chain remains intact.

## Deferred

- SF-F-02 Article detail + related + SEO metadata/structured data + sitemap/robots → 66-D.
- About/FAQ/Terms/Returns-Warranty approved content → 66-E.
- Contact/support → 66-F.
- Archive/stop-sale Storefront views → 66-G.

## Closure gate

MEDIUM risk. No Owner Human Gate. Before 66-D may mutate its scope, 66-C requires exact-head Canonical CI + Phase A, deterministic Review PASS, exact-artifact ACTIVE Lock, protected merge, exact-SHA postmerge verification and terminal Lock release.
