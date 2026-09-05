# Step 55-F — محتوا، قوانین و ممیزی نهایی

**وضعیت:** CLOSED / FINAL GATE PASS.

قرارداد `docs/13-product-design/step55-content-policy-final-audit-wireframes.json` منبع قطعی هفت صفحه F و ممیزی کل 37 صفحه است. generator قاب‌ها، companionها، گزارش audit و manifest را می‌سازد. Repository مرجع است و Figma اختیاری/غیرمسدودکننده می‌ماند.

## محدوده

| شناسه | سطح | Route intent | حالت‌ها | Trace mode |
|---|---|---|---|---|
| SF-F-01 | مجله و راهنمای قهوه | `/articles` | initial، first-use، no-result | openapi-direct-content-capability |
| SF-F-02 | راهنمای انتخاب آسیاب دستی | `/articles/:slug` | initial، no-result، failed | openapi-direct-content-capability |
| SF-F-03 | درباره ایکوفی | `/about` | initial، failed | static-approved-content |
| SF-F-04 | تماس و پشتیبانی | `/contact` | validation، submitting، failed | no-approved-public-mutation |
| SF-F-05 | پرسش‌های پرتکرار | `/faq` | initial، no-result، failed | static-approved-content |
| SF-F-06 | شرایط استفاده و قوانین خرید | `/policies/terms` | initial، no-result | static-approved-policy |
| SF-F-07 | سیاست مرجوعی و گارانتی | `/policies/returns-warranty` | initial، no-result | static-approved-policy |

Article فقط snapshot منتشرشده را نشان می‌دهد. About، FAQ و Policy محتوای مصوب دارند و claim یا Business Rule تازه نمی‌سازند. Contact intent فرم را تثبیت می‌کند اما بدون API عمومی مصوب، Runtime ارسال ادعا نمی‌شود.

## Responsive

| عرض | Grid | محتوا | قوانین | پشتیبانی |
|---:|---|---|---|---|
| 320px | 4 ستون، حاشیه 16، فاصله 12 | تک‌ستون با عنوان و metadata پیش از متن | فهرست محتوای خطی با anchor معنادار | فرم تمام‌عرض و مرجع امن |
| 360px | 4 ستون، حاشیه 16، فاصله 12 | کارت تک‌ستون با متن آزادتر | accordion/anchor بدون scroll افقی | فیلد و اقدام تمام‌عرض |
| 600px | 8 ستون، حاشیه 24، فاصله 16 | دو کارت یا متن bounded در 8 ستون | فهرست محتوا بالای بدنه | فرم bounded در 6 ستون |
| 840px | 12 ستون، حاشیه 32، فاصله 20 | فهرست 8 ستون و rail مرتبط 4 ستون | فهرست محتوا 3 ستون و متن 9 ستون | فرم 7 ستون و راهنما 5 ستون |
| 1200px | 12 ستون، حاشیه 32، فاصله 24 | بدنه خوانا 8/4 در ظرف bounded | ناوبری sticky بدون پوشاندن focus | فرم و کانال‌ها 7/5 |
| 1440px | 12 ستون در ظرف 1280 | عرض متن خوانا و rail در 1280 | 3/9 در ظرف 1280 | 7/5 در ظرف 1280 |

هر required state در 320px و state نخست هر صفحه در 1440px حاضر است. رفتار تمام عرض‌ها، zoom 400%، متن بلند فارسی، keyboard، focus، heading hierarchy و bidi در traceability ثبت است.

## قواعد و ممیزی

- فقط مقاله published و indexable از endpoint عمومی authoritative نمایش داده می‌شود؛ draft یا scheduled وارد Storefront نمی‌شود.
- صفحه مقاله slug، عنوان، تاریخ انتشار، نویسنده/منبع مجاز و related content را بدون اختراع claim نشان می‌دهد.
- no-result، first-use و failed از هم جدا هستند و retry فقط همان query را تکرار می‌کند.
- درباره ما از محتوای مصوب کسب‌وکار استفاده می‌کند و آمار، گواهی یا شریک ساختگی ندارد.
- قوانین قیمت، سفارش، ارسال، پرداخت، مرجوعی و گارانتی توضیح رابط‌اند و Business Rule تازه نمی‌سازند.
- قیمت‌ها تومان‌اند، Wallet وجود ندارد و نتیجه پرداخت فقط از status/verify authoritative می‌آید.
- سیاست مرجوعی یا گارانتی eligibility قطعی برای پرونده خاص وعده نمی‌دهد و کاربر را به بررسی سفارش خودش هدایت می‌کند.
- نسخه و تاریخ اجرای سیاست در سطح قابل مشاهده است؛ نبود سند published به no-result fail-closed منجر می‌شود.
- فرم تماس فقط موضوع، پیام و مرجع ماسک‌شده لازم را می‌گیرد و OTP، token، secret یا داده پرداخت درخواست نمی‌کند.
- ارسال پشتیبانی بدون API مصوب به‌عنوان Runtime موجود ادعا نمی‌شود؛ قاب فقط intent و حالت‌های فرم را تثبیت می‌کند.
- پیام خطا داده حساس یا وجود رکورد متعلق به دیگری را افشا نمی‌کند و ورودی امن حفظ می‌شود.
- کانال، ساعت پاسخ یا SLA بدون منبع مصوب وعده داده نمی‌شود.
- هر صفحه یک H1، landmarkهای معنادار، skip link و وضعیت قابل اعلام مستقل از رنگ دارد.
- هدف تعاملی حداقل 44×44 CSS px، focus واضح و error summary مرتبط با field دارد.
- عنوان‌های مقاله و سیاست سلسله‌مراتب منطقی دارند و فهرست محتوا به heading واقعی پیوند می‌خورد.
- در 400% zoom ترتیب معنایی حفظ و scroll دوبعدی صفحه ایجاد نمی‌شود.
- جست‌وجوی FAQ، pagination، related links و فرم تماس نام و ترتیب keyboard روشن دارند.
- هر 37 شناسه SF-B تا SF-F دقیقاً یک مالک Gate دارد و duplicate یا missing screen وجود ندارد.
- همه 12 journey فروشگاه حداقل یک mapping دارند و هر Component از قرارداد Step 54 می‌آید.
- هر 145 قاب مورد انتظار metadata دسترس‌پذیر، state، viewport و revision دارد.
- هر پنج manifest منبع و child artifactها را با SHA-256 می‌بندد و generator drift صفر است.
- عرض‌های 320، 360، 600، 840، 1200، 1440 و zoom 400% برای تمام صفحه‌ها ردیابی شده‌اند.
- هیچ exception باز، Wallet، رنگ Brown، دارایی برند اختراعی، Runtime یا paid/Figma dependency وجود ندارد.

## مرز

55-F هیچ Runtime، Route واقعی، API mutation، Migration، Dependency، Permission، Business Rule، Provider، فایل واقعی یا High-fidelity UI ایجاد نمی‌کند. exact-head CI، merge و post-merge CI پیاده‌سازی PASS شده‌اند و این state sync وضعیت بسته‌شدن Step 55 را قطعی می‌کند.
