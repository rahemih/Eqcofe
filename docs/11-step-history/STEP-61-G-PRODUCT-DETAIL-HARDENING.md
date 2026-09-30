# EQCOFE — Step 61-G Product Detail SEO, States, Accessibility and Responsive Hardening

## Baseline
Stage 61-G starts from canonical main `e3ff5427cac9029c081d94a7971f40640bb1c895` after Step 61-F protected closure.

## SEO
Product Detail receives route-level title, description, robots and canonical metadata. Canonical URLs use the site-owned `https://eqcofe.com` origin and canonical product slug only; request Host/header values are never trusted for canonical generation.

Ready public products are `index,follow`. Missing or failed Product Detail states are `noindex,follow` and do not emit a canonical URL.

## Product state hardening
- backend 404 is represented as canonical `empty/no-result` Product Detail state;
- forbidden, recovery and generic error retain distinct presentations;
- browser offline state overrides only retryable error/recovery presentation, without inventing product data;
- Product Detail navigation exposes a polite pending status and `aria-busy`;
- the application shell remains the single `main` landmark; Product Detail content uses an `article`.

## Accessibility and responsive hardening
- long Persian/product/specification/media text can wrap without horizontal overflow;
- product/cart/media regions keep zero-min-width grid/flex behavior;
- media controls retain minimum touch targets;
- mobile add-to-cart expands to available inline width;
- logical CSS properties and the no-brown palette constraint remain enforced.

## Deferral
Integrated browser acceptance and final Product Detail prototype verification remain Stage 61-H.

## Canonical completion
61-G requires exact-head Canonical CI, Phase A, Storefront Quality, Step57 Prototype, deterministic artifact-bound Review/Lock, protected merge, exact-SHA postmerge verification and terminal Lock RELEASED before 61-H.


## Verification module boundary repair
Pure Product Detail state presentation logic is isolated in `product-detail-state.ts`; the TSX component keeps only rendering and connectivity subscription. This preserves behavior while allowing root build verification to import the pure state logic without JSX compiler requirements.
