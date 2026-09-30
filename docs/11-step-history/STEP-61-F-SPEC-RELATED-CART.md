# EQCOFE — Step 61-F Specifications, Related Content and Add-to-Cart

## Baseline
Stage 61-F starts from canonical main `2009eba4d6b7426dbe88e8d7838a05e53d333f7d` after Step 61-E protected closure.

## Contract decisions
- Product specifications come directly from canonical `PublicProductResponse.specifications`.
- Placeholder OpenAPI routes `/products/{slug}/related` and `/products/{slug}/recommendations` remain non-executable debt and are **not** consumed.
- Related products use the real typed `GET /categories/{slug}/products` endpoint for the product's primary category, preserve backend ordering, exclude the current product and reuse the shared ListingGrid/ProductCard.
- Add-to-cart uses the existing authoritative Cart boundary without changing Cart/Pricing/Inventory rules.

## Guest-cart security boundary
If no valid guest cart credentials exist, Storefront creates a cart through `POST /cart`, stores only cart id/token in host-only HttpOnly SameSite=Lax cookies (Secure on HTTPS), and then calls `POST /cart/{id}/items` with `X-Cart-Token` server-side. The capability token is never exposed to client JavaScript, localStorage or sessionStorage.

Only `CART_ACCESS_DENIED` causes credential replacement. Stock, sellability, global-sales and checkout-state failures remain backend-authoritative and are surfaced as safe UI feedback.

## Historical verifier compatibility
Stage-C and Stage-D Product Detail verifiers are extended for the downstream primary-category related request and Stage-F cart handoff without weakening their original Product Detail/variant/price/stock assertions.

## Deferrals
- final SEO/loading/empty/error/offline/accessibility/responsive hardening → 61-G;
- integrated browser acceptance → 61-H.

## Canonical completion
61-F requires exact-head CI/Phase A/Storefront gates, deterministic artifact-bound REVIEW/LOCK, protected merge, exact-SHA postmerge verification and terminal Lock RELEASED before 61-G.
