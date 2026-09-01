# Step 55-D — سبد، تسویه‌حساب و بازیابی پرداخت

**وضعیت:** COMPLETE / GATE PASS — Step 55 ادامه دارد و 55-E هنوز شروع نشده است.

این پوشه خروجی Canonical کم‌جزئیات 55-D است. قرارداد `docs/13-product-design/step55-checkout-payment-wireframes.json` منبع تولید قطعی است و generator همه SVGها، companionها و manifest را می‌سازد. Repository مرجع است؛ Figma Mirror اختیاری و غیرمسدودکننده می‌ماند.

## محدوده

| شناسه | سطح | Route intent | حالت‌ها | اقدام اصلی |
|---|---|---|---|---|
| SF-D-01 | سبد خرید | `/cart` | first-use، quantity-invalid، price-changed | ادامه تسویه‌حساب |
| SF-D-02 | ورود و هویت تسویه‌حساب | `/checkout/identity` | validation، unauthenticated، submitting | تأیید هویت و ادامه |
| SF-D-03 | انتخاب نشانی تحویل | `/checkout/address` | first-use، validation، conflict | انتخاب نشانی و ادامه |
| SF-D-04 | روش ارسال | `/checkout/delivery` | initial، unavailable، disabled-with-reason | انتخاب ارسال و ادامه |
| SF-D-05 | بازبینی و ثبت سفارش | `/checkout/review` | price-changed، expired، submitting | ثبت سفارش و رفتن به پرداخت |
| SF-D-06 | بررسی نتیجه پرداخت | `/payment/return` | progressive، unknown-result، timeout | بررسی وضعیت پرداخت |
| SF-D-07 | نتیجه سفارش | `/order/:order-number/outcome` | success، failed، idempotent-replay | مشاهده جزئیات سفارش |

جریان از Cart به Identity، Address، Delivery و Review می‌رود؛ سپس Payment Return فقط با status/verify authoritative نتیجه را تعیین می‌کند و Order Outcome مسیر پایدار بعدی را نشان می‌دهد. callback، timeout یا replay هیچ‌گاه موفقیت ساختگی تولید نمی‌کند.

## Responsive

| عرض | Grid | Cart | Checkout | Payment/Outcome |
|---:|---|---|---|---|
| 320px | 4 columns / 16 margin / 16 gutter | کارت کالا و خلاصه سفارش عمودی | هر مرحله یک task؛ اقدام زیر محتوای مرتبط | StatePanel تک‌ستونه با مرجع قابل کپی |
| 360px | 4 columns / 16 margin / 16 gutter | کنترل تعداد 44px و جمع بدون تراکم | ورودی‌ها تمام‌عرض؛ progress متنی | اقدام اصلی و status check پشت‌سرهم |
| 600px | 8 columns / 24 margin / 24 gutter | کالاها 5 ستون و خلاصه 3 ستون یا stacked بر اساس محتوا | فرم 6 ستون با راهنمای 2 ستون | پنل وضعیت حداکثر 6 ستون |
| 840px | 12 columns / 32 margin / 24 gutter | فهرست 8 ستون و خلاصه sticky چهار ستون بدون پوشاندن focus | فرم 7 ستون و خلاصه پنج ستون | وضعیت 8 ستون و خلاصه سفارش چهار ستون |
| 1200px | 12 columns / 32 margin / 24 gutter | نسبت 8/4 و جمع authoritative | step content و order summary هم‌زمان | مرجع، timeline و recovery کنار خلاصه |
| 1440px | 12 columns / 32 margin / 24 gutter; content max 1280 | محتوا در 1280px مرکزی | نسبت‌ها ثابت و whitespace در gutter | پنل اصلی حداکثر 820px؛ خلاصه 436px |

هر صفحه سه state compact در 320px و یک state expanded در 1440px دارد. رفتار 360/600/840/1200، 400% zoom، متن بلند فارسی، keyboard-only، error association و bidi reference در traceability ثبت است.

## حقیقت تجاری و بازیابی

- قیمت، موجودی، تخفیف، نوع مشتری، هزینه ارسال و جمع فقط از quote authoritative می‌آیند.
- تمام مبالغ عدد صحیح گروه‌بندی‌شده با واحد صریح تومان‌اند و Wallet نمایش داده نمی‌شود.
- تغییر قیمت، موجودی، حداقل تعداد یا نوع مشتری quote قبلی را بی‌صدا معتبر نگه نمی‌دارد.
- cart TTL برابر 168 ساعت و checkout TTL برابر 15 دقیقه است؛ انقضا با مسیر بازسازی quote نشان داده می‌شود.
- رزرو موجودی و ثبت سفارش فقط پس از اعتبارسنجی نهایی انجام می‌شود؛ UI موفقیت زودهنگام نمی‌سازد.

- بازگشت Provider نتیجه پرداخت نیست؛ verify یا status authoritative تعیین‌کننده است.
- unknown-result، timeout و callback تکراری موفقیت یا شکست ساختگی نشان نمی‌دهند.
- retry فقط پس از status check و با idempotency/مرجع پایدار پیشنهاد می‌شود.
- شماره سفارش و شناسه پرداخت در bidi isolation و بدون نمایش secret ارائه می‌شوند.
- نتیجه نهایی سفارش، پرداخت ثبت‌شده و مسیر جزئیات/پشتیبانی را روشن می‌کند.

هویت، نشانی و روش ارسال از منابع مالک خود می‌آیند. تمام مبلغ‌ها تومان‌اند، Wallet وجود ندارد و cart/checkout expiry بی‌صدا دور زده نمی‌شود.

## مرز

55-D هیچ Runtime، Route واقعی، API، Migration، Dependency، Permission، Business Rule، Provider یا High-fidelity UI ایجاد نمی‌کند. Account و جزئیات سفارش در 55-E، Admin در Step 56 و Prototype در Step 57 باقی می‌مانند.
