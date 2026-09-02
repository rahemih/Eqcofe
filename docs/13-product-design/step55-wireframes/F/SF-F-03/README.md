# SF-F-03 — درباره ایکوفی

**Gate:** 55-F

**Fidelity:** structural low-fidelity

**Route intent:** `/about`

**Actors:** guest، retail، wholesale

**Operation trace:** static-approved-content

## هدف

کار اصلی **شناخت محدوده و ارزش پیشنهادی مصوب EQCOFE** است. اقدام اصلی «مشاهده دسته‌بندی محصولات» و بازیابی bounded «رفتن به تماس در صورت نبود محتوا» است. ترتیب محتوا هویت برند مصوب ← محدوده تجهیزات قهوه ← روش انتخاب/پشتیبانی ← مرز ادعاها ← راه ارتباط می‌ماند.

## حقیقت محتوا و سیاست

Published content، نسخه سیاست و پاسخ مصوب از منبع مالک خود می‌آیند. صفحه static هیچ API یا mutation ساختگی ادعا نمی‌کند. no-result با failed متفاوت است، ورودی امن حفظ می‌شود و retry فقط همان query را تکرار می‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `initial` | داستان و محدوده ایکوفی | فقط محتوای مصوب نمایش داده می‌شود؛ آمار، گواهی، شریک یا سابقه ساختگی وجود ندارد. | مشاهده محصولات |
| `failed` | محتوای درباره ما در دسترس نیست | متن حدسی جایگزین نمی‌شود و مسیر تماس و فروشگاه قابل استفاده می‌ماند. | تماس با ایکوفی |

Draft، scheduled content، قانون حدسی، eligibility قطعی، SLA یا کانال ساختگی نمایش داده نمی‌شود. پرداخت، مرجوعی، گارانتی و عمده‌فروشی همچنان به حقیقت authoritative مراحل قبلی ارجاع دارند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | تک‌ستون با عنوان و metadata پیش از متن | breadcrumb → H1 → metadata → headingها → related content |
| 360px | کارت تک‌ستون با متن آزادتر | breadcrumb → H1 → metadata → headingها → related content |
| 600px | دو کارت یا متن bounded در 8 ستون | breadcrumb → H1 → metadata → headingها → related content |
| 840px | فهرست 8 ستون و rail مرتبط 4 ستون | breadcrumb → H1 → metadata → headingها → related content |
| 1200px | بدنه خوانا 8/4 در ظرف bounded | breadcrumb → H1 → metadata → headingها → related content |
| 1440px | عرض متن خوانا و rail در 1280 | breadcrumb → H1 → metadata → headingها → related content |

در zoom 400% صفحه فقط scroll عمودی دارد. یک H1، heading hierarchy، هدف 44px، focus نمایان، status announcement و error association مستقل از رنگ هستند.

## ردیابی

Journeyها: static IA route بدون journey عملیاتی. قابلیت‌ها: NONE — هیچ API ساختگی. Componentها: `Card`.

## Artifactها

- `SF-F-03--320--initial--v1.svg`
- `SF-F-03--1440--initial--v1.svg`
- `SF-F-03--320--failed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند؛ قاب‌ها خروجی قطعی‌اند و مستقیم ویرایش نمی‌شوند.
