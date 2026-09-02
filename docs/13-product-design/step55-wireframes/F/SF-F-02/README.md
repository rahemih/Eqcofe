# SF-F-02 — راهنمای انتخاب آسیاب دستی

**Gate:** 55-F

**Fidelity:** structural low-fidelity

**Route intent:** `/articles/:slug`

**Actors:** guest، retail، wholesale

**Operation trace:** openapi-direct-content-capability

## هدف

کار اصلی **خواندن محتوای published با ساختار قابل پیمایش** است. اقدام اصلی «مشاهده مقاله مرتبط» و بازیابی bounded «بازگشت به فهرست یا تلاش دوباره» است. ترتیب محتوا breadcrumb ← عنوان و metadata ← خلاصه ← headingها و متن ← منبع مجاز ← related content می‌ماند.

## حقیقت محتوا و سیاست

Published content، نسخه سیاست و پاسخ مصوب از منبع مالک خود می‌آیند. صفحه static هیچ API یا mutation ساختگی ادعا نمی‌کند. no-result با failed متفاوت است، ورودی امن حفظ می‌شود و retry فقط همان query را تکرار می‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `initial` | مقاله منتشرشده آماده مطالعه است | slug، تاریخ انتشار، headingها و related content از snapshot عمومی آمده‌اند. | مطالعه مقاله مرتبط |
| `no-result` | این مقاله در دسترس نیست | draft، حذف‌شده یا slug نامعتبر به محتوای حدسی تبدیل نمی‌شود. | بازگشت به همه مقاله‌ها |
| `failed` | دریافت مقاله انجام نشد | عنوان یا متن قدیمی نمایش داده نمی‌شود و retry همان slug را می‌خواند. | تلاش دوباره |

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

Journeyها: `SJ-01`. قابلیت‌ها: `GET /articles/{slug}`، `GET /articles/{slug}/related`. Componentها: `Card`، `StatePanel`.

## Artifactها

- `SF-F-02--320--initial--v1.svg`
- `SF-F-02--1440--initial--v1.svg`
- `SF-F-02--320--no-result--v1.svg`
- `SF-F-02--320--failed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند؛ قاب‌ها خروجی قطعی‌اند و مستقیم ویرایش نمی‌شوند.
