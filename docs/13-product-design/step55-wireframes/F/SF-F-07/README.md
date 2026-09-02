# SF-F-07 — سیاست مرجوعی و گارانتی

**Gate:** 55-F

**Fidelity:** structural low-fidelity

**Route intent:** `/policies/returns-warranty`

**Actors:** guest، retail، wholesale

**Operation trace:** static-approved-policy

## هدف

کار اصلی **فهم فرایند عمومی بدون وعده eligibility پرونده خاص** است. اقدام اصلی «بررسی سفارش خودم» و بازیابی bounded «رفتن به حساب یا پشتیبانی» است. ترتیب محتوا نسخه/تاریخ اجرا ← شرایط عمومی ← موارد خارج از پوشش ← فرایند مرجوعی ← فرایند گارانتی ← پیگیری پرونده می‌ماند.

## حقیقت محتوا و سیاست

Published content، نسخه سیاست و پاسخ مصوب از منبع مالک خود می‌آیند. صفحه static هیچ API یا mutation ساختگی ادعا نمی‌کند. no-result با failed متفاوت است، ورودی امن حفظ می‌شود و retry فقط همان query را تکرار می‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `initial` | سیاست خدمات پس از فروش منتشر شده است | شرایط عمومی و فرایندها روشن‌اند؛ eligibility نهایی فقط روی سفارش customer-owned بررسی می‌شود. | بررسی سفارش خودم |
| `no-result` | سیاست منتشرشده در دسترس نیست | وعده یا شرط حدسی نمایش داده نمی‌شود و مسیر پشتیبانی امن باقی می‌ماند. | تماس با پشتیبانی |

Draft، scheduled content، قانون حدسی، eligibility قطعی، SLA یا کانال ساختگی نمایش داده نمی‌شود. پرداخت، مرجوعی، گارانتی و عمده‌فروشی همچنان به حقیقت authoritative مراحل قبلی ارجاع دارند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | فهرست محتوای خطی با anchor معنادار | H1 → نسخه → فهرست محتوا → بخش‌ها → اقدام |
| 360px | accordion/anchor بدون scroll افقی | H1 → نسخه → فهرست محتوا → بخش‌ها → اقدام |
| 600px | فهرست محتوا بالای بدنه | H1 → نسخه → فهرست محتوا → بخش‌ها → اقدام |
| 840px | فهرست محتوا 3 ستون و متن 9 ستون | H1 → نسخه → navigation 3 ستون → policy 9 ستون → اقدام |
| 1200px | ناوبری sticky بدون پوشاندن focus | H1 → نسخه → navigation 3 ستون → policy 9 ستون → اقدام |
| 1440px | 3/9 در ظرف 1280 | H1 → نسخه → navigation 3 ستون → policy 9 ستون → اقدام |

در zoom 400% صفحه فقط scroll عمودی دارد. یک H1، heading hierarchy، هدف 44px، focus نمایان، status announcement و error association مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-08`، `SJ-09`. قابلیت‌ها: NONE — هیچ API ساختگی. Componentها: `Card`، `Alert`.

## Artifactها

- `SF-F-07--320--initial--v1.svg`
- `SF-F-07--1440--initial--v1.svg`
- `SF-F-07--320--no-result--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند؛ قاب‌ها خروجی قطعی‌اند و مستقیم ویرایش نمی‌شوند.
