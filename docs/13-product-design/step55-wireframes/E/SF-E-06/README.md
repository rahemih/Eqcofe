# SF-E-06 — ابزارهای مشتری

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/tools`  
**Actors:** retail، wholesale

## هدف

کار اصلی **مدیریت علاقه‌مندی، هشدار، امتیاز و نظر** است. اقدام اصلی «مشاهده علاقه‌مندی‌ها» و بازیابی bounded «تلاش دوباره برای تب ناموفق» است. ترتیب محتوا Tabs معنادار ← علاقه‌مندی ← هشدار محصول ← امتیاز و مزایا ← نظرهای مجاز می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `first-use` | فهرست علاقه‌مندی خالی است | محصولی ذخیره نشده و تب‌های هشدار و امتیاز همچنان قابل دسترس‌اند. | پیدا کردن محصول |
| `partial` | هشدارها در دسترس نیستند | علاقه‌مندی و امتیاز حاضرند؛ فقط بخش ناموفق دوباره درخواست می‌شود. | تلاش دوباره برای هشدارها |
| `server-validation` | ثبت نظر پذیرفته نشد | شرایط سفارش یا محتوای نظر از پاسخ سرور نمایش داده می‌شود و متن امن حفظ می‌ماند. | اصلاح نظر |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | کارت‌های تک‌ستون و ناوبری خطی | H1 → tabs → panel heading → cards/form → status → action |
| 360px | کارت تک‌ستون با متن آزادتر | H1 → tabs → panel heading → cards/form → status → action |
| 600px | دو کارت در ردیف در صورت ظرفیت | H1 → tabs → panel heading → cards/form → status → action |
| 840px | ناوبری 3 ستون و محتوا 9 ستون | H1 → tabs → panel heading → cards/form → status → action |
| 1200px | ناوبری ثابت 3/9 | H1 → tabs → panel heading → cards/form → status → action |
| 1440px | ناوبری ثابت 3/9 در 1280 | H1 → tabs → panel heading → cards/form → status → action |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-12`. قابلیت‌ها: `GET /customer/wishlist`، `POST /customer/wishlist/{product_id}`، `DELETE /customer/wishlist/{product_id}`، `GET /customer/product-alerts`، `POST /customer/product-alerts`، `DELETE /customer/product-alerts/{id}`، `GET /customer/loyalty`، `GET /customer/loyalty/history`، `GET /customer/loyalty/benefits`، `POST /customer/products/{product_id}/reviews`. Componentها: `Tabs`، `Card`، `StatePanel`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-06--320--first-use--v1.svg`
- `SF-E-06--1440--first-use--v1.svg`
- `SF-E-06--320--partial--v1.svg`
- `SF-E-06--320--server-validation--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
