# EQCOFE — Step 61-D Variant Selection, Price and Stock States

## Baseline
Stage 61-D starts from canonical main `ca59269b666c263e8ec35ede38b0d1d6fefe230f` after Step 61-C protected closure.

## Implemented boundary
- productionizes `/product/:slug`;
- preserves server-only Product Detail loading;
- adds typed `GET /products/{slug}/variants` loading;
- renders selectable public variants;
- displays backend-authoritative current/old Toman price;
- displays backend-authoritative sale-enabled, stock and low-stock states;
- low stock count is shown only when the authoritative quantity is below 10.

## Presentation-only selection policy
The default UI selection prefers:
1. sales-enabled + available + in-stock + priced;
2. otherwise sales-enabled + available;
3. otherwise the first backend-returned variant.

This never changes Pricing or Inventory truth and performs no mutation.

## Explicit deferrals
- media gallery, video and 3D/360 capability → 61-E;
- specifications, related content and add-to-cart → 61-F;
- final SEO/loading/error/offline/accessibility/responsive hardening → 61-G;
- integrated browser acceptance → 61-H.

## Canonical completion
Stage 61-D is not complete until protected Merge Policy transport, exact-SHA postmerge verification and terminal Lock RELEASED are all green.
