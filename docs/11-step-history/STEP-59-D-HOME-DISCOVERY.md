# Step 59-D — Home Discovery: Categories & Brands

**Stage 59-D turns Home discovery into a real, accessible entry surface without implementing Step-60 listings or inventing untyped taxonomy API contracts.**

## خلاصه ساده

در این مرحله صفحهٔ خانه دیگر فقط placeholder نیست. دسته‌هایی که در دادهٔ معتبر محصولات دیده می‌شوند به مسیر دسته وصل می‌شوند و برندهای معتبر از همان داده به جست‌وجوی نام برند هدایت می‌شوند. هیچ دسته یا برند ساختگی، رتبه‌بندی تبلیغاتی یا API تازه‌ای ساخته نمی‌شود.

## Canonical baseline

- Stage 59-C merge/main: `175fb3f7e110eff98b9574dc9db5984e5e77ae7b`
- Stage 59-C protected merge/postmerge: PASS
- Stage 59-C lock: RELEASED
- live open PRs before Stage-D branch creation: 0

## Contract reconciliation

Backend واقعی public endpoints زیر را دارد:
- `GET /categories`
- `GET /brands`

اما generated OpenAPI فعلی برای response body این دو list endpoint هنوز type معتبر تعریف نکرده است. همچنین nested `ProductCard.brand` و `ProductCard.primary_category` به صورت object ناشناخته تولید شده‌اند.

Stage 59-D برای جلوگیری از contract drift:
- مستقیماً `/categories` یا `/brands` را صدا نمی‌زند؛
- DTO authoritative جدید تعریف نمی‌کند؛
- فقط projection نمایشی کوچکی از objectهای موجود می‌سازد؛
- هر object فقط وقتی پذیرفته می‌شود که `id`، `slug` و `name_fa` معتبر داشته باشد؛
- object ناقص یا ناشناخته fail-closed حذف می‌شود.

## Discovery behavior

- دسته‌ها: `/category/:slug` — مقصد موجود و متعلق به Step 60.
- برندها: `/search?q=<name_fa>` — استفاده از search entry موجود؛ Brand page جدید اختراع نمی‌شود.
- ترتیب: اولین رخداد در پاسخ authoritative حفظ می‌شود؛ هیچ ranking/recommendation score سمت مرورگر ساخته نمی‌شود.
- تکراری‌ها با شناسه حذف می‌شوند.
- اگر Home data در state ready نباشد، taxonomy جعلی نمایش داده نمی‌شود.

## Home production boundary after Stage D

- یک H1 واقعی Home.
- معرفی کوتاه discovery.
- بخش دسته‌های قابل مرور.
- بخش برندهای قابل جست‌وجو.
- حداقل target تعاملی 44×44.
- RTL و logical CSS.
- Step-60 routeها هنوز placeholder هستند.
- محصول‌های منتخب، promotionها و hardening کامل stateها هنوز برای 59-E/F باقی می‌مانند.

## Explicit non-scope

- direct GET /categories or GET /brands consumption;
- OpenAPI/backend/database mutation;
- complete Category/Search listing;
- filters/sort/pagination;
- product cards and merchandising;
- campaign/promotion surfaces;
- compare/wishlist/cart/checkout;
- ranking or personalized recommendation logic.

## Definition of Done

- projection validation/deduplication verified;
- correct category/search destinations verified;
- SSR renders authoritative discovery with a mock API;
- one Home H1 and accessible semantic sections;
- Storefront verify and Browser Quality pass;
- root verify, Canonical CI and Phase A pass;
- exact-artifact REVIEW/LOCK pass;
- protected merge and exact-SHA postmerge verification pass;
- only then may 59-E begin.

```text
STEP_59_C = CLOSED_CANONICAL_PASS
STEP_59_D = IN_PROGRESS
STEP_59_E = BLOCKED
DIRECT_TAXONOMY_LIST_API = BLOCKED_BY_OPENAPI_TYPING
STEP_60 = NOT_STARTED
```
