# Step 59-E — Home Merchandising & Promotional Surfaces

**Stage 59-E adds bounded merchandising to Home without moving business authority into the browser or implementing downstream Steps early.**

## خلاصه ساده

صفحهٔ خانه در این مرحله چند محصول واقعی را از همان پاسخ معتبر Backend نمایش می‌دهد، قیمت را فقط با واحد تومان نشان می‌دهد و وضعیت موجود/ناموجود/توقف فروش را از دادهٔ سرور می‌گیرد. برای تصویر، تا وقتی media معتبر typed در این سطح نداریم، فقط قاب خنثی «رسانه محصول» استفاده می‌شود.

همچنین دو مسیر معرفی می‌شوند:
- راهنمای خرید → مسیر موجود `/articles`؛ محتوای کامل آن متعلق به Step 66 است.
- خرید عمده → مسیر موجود `/wholesale`؛ اجرای کامل آن متعلق به Step 65 است و وضعیت/قیمت عمده فقط با تأیید authoritative Backend معتبر است.

## Canonical baseline

- Stage 59-D merge/main: `4ef4027c1bf761a9d6abade15eec89f2dbee7e00`
- Stage 59-D protected merge/postmerge: PASS
- Stage 59-D Lock: RELEASED
- live open PRs before Stage-E branch creation: 0

## Product merchandising rule

Wireframe Home، «محصول‌های منتخب» را در content priority دارد، اما Backend در قرارداد فعلی flag یا ranking مستقل برای editorial selection ندارد. بنابراین Stage 59-E ادعای «پیشنهاد هوشمند»، «محبوب‌ترین» یا «منتخب تحریریه» نمی‌کند.

رفتار قطعی:
- پاسخ `GET /products` همان ترتیب authoritative خود را حفظ می‌کند.
- حداکثر شش محصول معتبر نمایش داده می‌شود.
- هیچ score/ranking سمت Client ساخته نمی‌شود.
- نام، قیمت جاری و availability از response معتبر گرفته می‌شوند.
- current price با واحد صریح تومان نمایش داده می‌شود.
- stock count ساخته نمی‌شود.
- discount یا wholesale price ساخته نمی‌شود.
- کارت به `/product/:slug` می‌رود؛ Product Detail هنوز Step 61 placeholder است.

## Promotional surfaces

### Buying Guide
Wireframe Home «راهنمای خرید» را الزام کرده است. Stage E فقط entry surface به `/articles` می‌سازد؛ تولید/نمایش کامل content متعلق به Step 66 است.

### Wholesale
Product Vision و Business Rules، مشتری عمده و approval authoritative را تثبیت کرده‌اند. Home می‌تواند CTA عمده داشته باشد، اما:
- کاربر خودش wholesale status اعلام نمی‌کند.
- قیمت/مزیت عمده در Home جعل نمی‌شود.
- CTA فقط به `/wholesale` می‌رود؛ اجرای کامل متعلق به Step 65 است.

### First-purchase campaign
در Product Vision و Business Rules فعلی روی `main` Evidence canonical برای جشنواره خرید اول پیدا نشد. بنابراین Stage E آن را عمداً پیاده‌سازی نمی‌کند. این تصمیم fail-closed است و از حافظه/گفتگوهای قدیمی به‌جای Canonical Repository استفاده نمی‌شود.

## Explicit non-scope

- personalized recommendation/ranking;
- campaign engine or discount percentages;
- first-purchase festival;
- new backend/OpenAPI/database changes;
- Product Detail implementation;
- Articles implementation;
- Wholesale application/account implementation;
- Search/Category listing/filter/sort/pagination;
- Cart/Checkout/Payment;
- Wallet;
- invented product imagery or logos.

## Definition of Done

- bounded authoritative product cards pass deterministic/SSR verification;
- explicit Toman and availability semantics verified;
- neutral media placeholder verified;
- /product, /articles and /wholesale handoff routes verified;
- Step 61/65/66 placeholder boundaries preserved;
- Storefront verify and Browser Quality pass;
- root verify, Canonical CI and Phase A pass;
- exact-artifact REVIEW/LOCK pass;
- protected merge and exact-SHA postmerge verification pass;
- only then may 59-F begin.

```text
STEP_59_D = CLOSED_CANONICAL_PASS
STEP_59_E = IN_PROGRESS
STEP_59_F = BLOCKED
FIRST_PURCHASE_CAMPAIGN = NOT_IMPLEMENTED_NO_CANONICAL_EVIDENCE
STEP_60 = NOT_STARTED
STEP_61 = NOT_STARTED
STEP_65 = NOT_STARTED
STEP_66 = NOT_STARTED
```
