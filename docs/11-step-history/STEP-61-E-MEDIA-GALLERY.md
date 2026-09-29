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

## Deferrals
- specifications, related content and add-to-cart → 61-F;
- final SEO/state/accessibility/responsive hardening → 61-G;
- integrated browser acceptance → 61-H.

## Canonical completion
61-E is complete only after protected Merge Policy transport, exact-SHA postmerge verification and terminal Lock RELEASED.
