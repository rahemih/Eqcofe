# EQCOFE — Step 61-C Shared Product Detail Foundation

## Status
Stage 61-C starts from canonical main `5a39afcd7e38cccbf1a0906dec7df6fe01589853` after Step 61-B protected closure.

## Scope
This stage introduces only the shared Storefront Product Detail foundation:
- generated OpenAPI aliases for Product Detail, variants, media and specifications;
- server-only `GET /products/{slug}` loader through the existing customer-session bridge;
- inherited async failure/recovery policy;
- authoritative Product Detail summary primitive;
- logical RTL/responsive styling;
- deterministic Stage-C verifier wired into Storefront verify.

## Explicit deferrals
The existing `/product/:slug` route remains a Step-61 placeholder in this stage. Stage 61-C does not implement:
- variant selection or availability interaction (61-D);
- separate variant-endpoint runtime fetching (61-D);
- gallery/video/rich-media interaction or unsupported 3D/360 claims (61-E);
- specifications/related-content/cart mutation behavior (61-F);
- final SEO/loading/error/offline/accessibility hardening (61-G);
- integrated browser acceptance (61-H).

## Invariants
- generated OpenAPI/backend remain authoritative;
- integer Toman only;
- Persian-first RTL;
- no Wallet semantics;
- no brown palette;
- no backend/API/database/dependency mutation;
- no invented price, stock, variant, media or availability facts.

## Canonical completion gate
Implementation presence is not completion. Stage 61-C becomes canonical only after exact-head verification, Phase A, applicable Storefront quality gates, deterministic Review, exact-artifact ACTIVE Lock, protected Merge Policy transport, exact-SHA postmerge verification and terminal Lock RELEASED.
