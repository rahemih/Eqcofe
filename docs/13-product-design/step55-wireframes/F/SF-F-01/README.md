# SF-F-01 — مجله و راهنمای قهوه

**Gate:** 55-F

**Fidelity:** structural low-fidelity

**Route intent:** `/articles`

**Actors:** guest، retail، wholesale

**Operation trace:** openapi-direct-content-capability

## هدف

کار اصلی **پیدا کردن مقاله published و مرتبط** است. اقدام اصلی «مطالعه مقاله» و بازیابی bounded «پاک‌کردن فیلتر یا تلاش دوباره» است. ترتیب محتوا عنوان و معرفی ← موضوع/جست‌وجو ← کارت مقاله ← تاریخ/خلاصه ← pagination ← related discovery می‌ماند.

## حقیقت محتوا و سیاست

Published content، نسخه سیاست و پاسخ مصوب از منبع مالک خود می‌آیند. صفحه static هیچ API یا mutation ساختگی ادعا نمی‌کند. no-result با failed متفاوت است، ورودی امن حفظ می‌شود و retry فقط همان query را تکرار می‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `initial` | مقاله‌های منتشرشده آماده‌اند | فهرست authoritative با عنوان، تاریخ و خلاصه واقعی نمایش داده می‌شود. | مطالعه راهنمای انتخاب آسیاب |
| `first-use` | هنوز مقاله‌ای منتشر نشده است | draft یا scheduled نمایش داده نمی‌شود و مسیر محصولات و FAQ باقی می‌ماند. | مشاهده پرسش‌های پرتکرار |
| `no-result` | مقاله‌ای با این جست‌وجو پیدا نشد | عبارت واردشده حفظ می‌شود و پاک‌کردن query مسیر bounded است. | پاک‌کردن جست‌وجو |

Draft، scheduled content، قانون حدسی، eligibility قطعی، SLA یا کانال ساختگی نمایش داده نمی‌شود. پرداخت، مرجوعی، گارانتی و عمده‌فروشی همچنان به حقیقت authoritative مراحل قبلی ارجاع دارند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | تک‌ستون با عنوان و metadata پیش از متن | H1 → جست‌وجو/موضوع → کارت‌ها → pagination → recovery |
| 360px | کارت تک‌ستون با متن آزادتر | H1 → جست‌وجو/موضوع → کارت‌ها → pagination → recovery |
| 600px | دو کارت یا متن bounded در 8 ستون | H1 → جست‌وجو/موضوع → کارت‌ها → pagination → recovery |
| 840px | فهرست 8 ستون و rail مرتبط 4 ستون | H1 → جست‌وجو/موضوع → کارت‌ها → pagination → recovery |
| 1200px | بدنه خوانا 8/4 در ظرف bounded | H1 → جست‌وجو/موضوع → کارت‌ها → pagination → recovery |
| 1440px | عرض متن خوانا و rail در 1280 | H1 → جست‌وجو/موضوع → کارت‌ها → pagination → recovery |

در zoom 400% صفحه فقط scroll عمودی دارد. یک H1، heading hierarchy، هدف 44px، focus نمایان، status announcement و error association مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-01`. قابلیت‌ها: `GET /articles`. Componentها: `Card`، `Pagination`، `StatePanel`.

## Artifactها

- `SF-F-01--320--initial--v1.svg`
- `SF-F-01--1440--initial--v1.svg`
- `SF-F-01--320--first-use--v1.svg`
- `SF-F-01--320--no-result--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند؛ قاب‌ها خروجی قطعی‌اند و مستقیم ویرایش نمی‌شوند.
