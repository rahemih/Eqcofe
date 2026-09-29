# EQCOFE — Step 61-E Media Gallery, Video and 3D/360 Capability Boundary

## Baseline
Stage 61-E starts from canonical main `af9ce9b279f04c944763acb312cd85a53b129a2b` after Step 61-D protected closure.

## Canonical media truth
Public Product Detail exposes active `image` and `video` descriptors with `storage_key`, MIME, variant binding, order, primary flag, alt text and dimensions. `storage_key` is not treated as a public viewer URL.

The canonical contract exposes no 3D/360 media type, model URL, spin-frame set or 3D metadata. Stage 61-E therefore reports that capability as unavailable rather than fabricating assets or metadata.

## Implemented boundary
- optional server-only `EQCOFE_MEDIA_PUBLIC_BASE_URL`;
- strict storage-key validation and canonical segment encoding;
- image and native-video viewer;
- previous/next and explicit media-list controls;
- product-level media plus selected-variant media;
- safe unavailable state if delivery configuration is absent or invalid;
- explicit 3D/360 capability notice.

## Legacy QA compatibility
Step59 merchandising verification is migrated from obsolete direct `ProductVariantSelector` route ownership to the production composition boundary `product route -> ProductDetailExperience -> ProductVariantSelector`. The original production-route assertion remains in force.

Step59 acceptance verification is migrated by the same rule: it verifies `ProductDetailExperience` at the route and `ProductVariantSelector` inside that composition without restoring obsolete direct ownership.

## Deferrals
- specifications, related content and add-to-cart → 61-F;
- final SEO/state/accessibility/responsive hardening → 61-G;
- integrated browser acceptance → 61-H.

## Canonical completion
61-E is complete only after protected Merge Policy transport, exact-SHA postmerge verification and terminal Lock RELEASED.


## Owner-authorized repair-budget amendment
After three repair cycles, Canonical CI exposed one additional legacy ownership assertion in `verify-step61-variant-price-stock.ts`. The Project Owner explicitly authorized one additional repair cycle, limited to:
- increasing `max_repair_cycles` from 3 to 4;
- adding that verifier to the Step 61-E write/risk scope;
- migrating only the obsolete direct-route `ProductVariantSelector` assertion to the production composition `route -> ProductDetailExperience -> ProductVariantSelector`.

No runtime, backend, OpenAPI, database, dependency, price or stock authority behavior is changed by this amendment.


## Client/server module boundary repair
Within the Owner-authorized fourth repair cycle, pure media capabilities/types/selection were split into a client-safe module. Delivery resolution and environment access remain server-only. No client component imports a `.server` module.
