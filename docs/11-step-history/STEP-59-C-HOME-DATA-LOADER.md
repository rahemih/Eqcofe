# Step 59-C — Home Data Contract & Server Loader Foundation

**Stage 59-C adds only the authoritative server-data boundary for Home. It does not implement the final Home discovery/merchandising UI.**

## خلاصه ساده

در این مرحله صفحهٔ خانه به API واقعی محصولات وصل می‌شود، اما هنوز محصول‌ها را به‌عنوان بخش نهایی Home نمایش نمی‌دهیم. هدف این است که مسیر دریافت داده، کوکی نشست مشتری، قیمت/موجودی authoritative و حالت‌های خطا قبل از ساخت UI اصلی درست و امن باشند.

## Canonical baseline

- Stage 59-B canonical merge: `d7d235f5f240b8bea44bc607afa812b2f5bb12d4`
- Mission V1.6 Closure R2 canonical merge: `c7acd425643cfde4f9d736216e29b83323db178e`
- PR #237 protected merge/postmerge: PASS
- PR #237 lock: RELEASED
- live open PRs before Stage-C branch creation: 0

## Contract findings

- `GET /products` has a generated typed JSON response: `ProductListResponse` with backend-authoritative `ProductCard` price and availability views.
- `GET /categories` and `GET /brands` currently exist in OpenAPI but their 200 responses have `content?: never`.
- Therefore Stage 59-C must not invent Category/Brand JSON shapes.
- Home wireframe `SF-B-01` names `GET /products` and `GET /search/suggestions`; search suggestions/results remain outside this Stage.
- The Home design does not freeze a product count/sort rule, so Stage 59-C sends no invented `limit`, `sort`, `category`, `brand` or availability filter.

## Implemented boundary

- server-only Home data module;
- generated OpenAPI typing for `GET /products`;
- existing customer-session bridge for authenticated/wholesale-aware server requests;
- validated customer `Set-Cookie` relay through the route loader;
- ready/first-use-empty/error/recovery classification through the existing state foundation;
- Home route loader wiring with serializable loader data;
- no client token storage or direct browser API credential authority;
- dedicated deterministic Stage-C verification.

## Explicit non-scope

- final Home product cards/merchandising;
- category/brand discovery UI or payload invention;
- search suggestions/results;
- filters/sort/pagination;
- product detail;
- compare/wishlist;
- cart/checkout;
- backend/API/OpenAPI/database changes;
- dependencies or lockfile changes.

## Stage 59-C Definition of Done

- exact scope only;
- typed GET /products server boundary;
- customer session cookie forwarding and sanitized Set-Cookie relay verified;
- empty and safe failure/recovery states verified;
- no category/brand model invention;
- Storefront verify and Browser Quality pass;
- root pnpm verify, Canonical CI and Phase A pass;
- exact-artifact REVIEW/LOCK pass;
- protected merge and exact-SHA postmerge verify pass;
- only then may 59-D begin.

```text
STEP_59_B = CLOSED_CANONICAL_PASS
STEP_59_C = IN_PROGRESS
STEP_59_D = BLOCKED
CATEGORY_BRAND_PAYLOAD_INVENTION = FORBIDDEN
STEP_60 = NOT_STARTED
```
