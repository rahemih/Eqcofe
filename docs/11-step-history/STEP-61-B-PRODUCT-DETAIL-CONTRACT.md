# EQCOFE — Step 61-B Product Detail Contract Readiness

## Purpose
Close the backend/OpenAPI gaps required by the production Product Detail experience before Storefront implementation.

Canonical base: `bb1b9be162696c302248b8b6244095e30d5aa100` (Step 61-A canonical closure).

## Verified starting gaps
1. `GET /products/{slug}` is typed as `ProductResponse`, but runtime already returns `price` and `specifications` that the schema omits.
2. Runtime returns only `primary_image`; canonical `catalog.product_media` already supports ordered product/variant attachments and active image/video media.
3. Variant query already has Pricing and Catalog attributes but returns `availability: null`; Inventory has an authoritative batch online-sellable quantity port.
4. Public `GET /products/{slug}/variants` exists but its success response is not typed and currently shares the same method used by Admin.
5. `POST /cart/{id}/items` is already an authoritative add-to-cart boundary and must not be redesigned here.

## Capability boundary
The canonical media model supports `image`, `video`, and `document`. Step 61-B exposes only active image/video attachments to the public Product Detail contract. It does **not** invent a 3D/360 media type, viewer URL or metadata. Any true 3D/360 backend capability is deferred to the later media implementation stage and requires its own governed contract change.

## Authorized implementation
- align `ProductResponse` with public Product Detail runtime;
- expose safe ordered active public product media with optional Variant binding;
- provide explicit public Variant DTOs with attributes, Pricing-owned price and Inventory-owned availability;
- type `GET /products/{slug}/variants`;
- preserve Admin variant behavior through a separate public projection;
- add focused regression/contract tests;
- regenerate generated OpenAPI types.

## Out of scope
No Storefront page implementation, DB migration, dependency change, Cart/Pricing/Inventory domain mutation, Compare/Wishlist, checkout/account, or invented 3D/360 capability.

## Canonical closure
This HIGH-risk stage requires exact-head technical/security gates, artifact-bound Lock, explicit Human Gate approval, protected merge, exact-SHA postmerge verification and terminal Lock release before 61-C starts.
