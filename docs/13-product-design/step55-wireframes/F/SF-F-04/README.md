# SF-F-04 — تماس و پشتیبانی

**Gate:** 55-F

**Fidelity:** structural low-fidelity

**Route intent:** `/contact`

**Actors:** guest، retail، wholesale

**Operation trace:** no-approved-public-mutation

## هدف

کار اصلی **آماده‌کردن درخواست پشتیبانی با حداقل داده لازم** است. اقدام اصلی «ارسال درخواست پشتیبانی» و بازیابی bounded «اصلاح فیلد یا استفاده از کانال مصوب» است. ترتیب محتوا موضوع ← اطلاعات تماس ماسک‌شده ← شماره سفارش/پرونده اختیاری ← پیام ← هشدار داده حساس ← اقدام می‌ماند.

## حقیقت محتوا و سیاست

Published content، نسخه سیاست و پاسخ مصوب از منبع مالک خود می‌آیند. صفحه static هیچ API یا mutation ساختگی ادعا نمی‌کند. no-result با failed متفاوت است، ورودی امن حفظ می‌شود و retry فقط همان query را تکرار می‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `validation` | اطلاعات تماس نیاز به اصلاح دارد | موضوع یا پیام کامل نیست؛ خطاها به field متصل‌اند و ورودی امن حفظ می‌شود. | تکمیل موارد مشخص‌شده |
| `submitting` | درخواست در حال ارسال است | ارسال دوباره غیرفعال می‌ماند و موفقیت پیش از پاسخ authoritative اعلام نمی‌شود. | لطفاً منتظر بمانید |
| `failed` | ارسال درخواست انجام نشد | پیام امن حفظ شده و شماره سفارش ماسک‌شده است؛ کانال یا SLA ساختگی ارائه نمی‌شود. | تلاش دوباره |

Draft، scheduled content، قانون حدسی، eligibility قطعی، SLA یا کانال ساختگی نمایش داده نمی‌شود. پرداخت، مرجوعی، گارانتی و عمده‌فروشی همچنان به حقیقت authoritative مراحل قبلی ارجاع دارند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | فرم تمام‌عرض و مرجع امن | H1 → privacy alert → error summary → fields → primary → alternate contact |
| 360px | فیلد و اقدام تمام‌عرض | H1 → privacy alert → error summary → fields → primary → alternate contact |
| 600px | فرم bounded در 6 ستون | H1 → privacy alert → error summary → fields → primary → alternate contact |
| 840px | فرم 7 ستون و راهنما 5 ستون | H1 → privacy alert → error summary → fields → primary → alternate contact |
| 1200px | فرم و کانال‌ها 7/5 | H1 → privacy alert → error summary → fields → primary → alternate contact |
| 1440px | 7/5 در ظرف 1280 | H1 → privacy alert → error summary → fields → primary → alternate contact |

در zoom 400% صفحه فقط scroll عمودی دارد. یک H1، heading hierarchy، هدف 44px، focus نمایان، status announcement و error association مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-05`، `SJ-08`، `SJ-09`. قابلیت‌ها: NONE — هیچ API ساختگی. Componentها: `TextField`، `Select`، `Button`، `Alert`.

## Artifactها

- `SF-F-04--320--validation--v1.svg`
- `SF-F-04--1440--validation--v1.svg`
- `SF-F-04--320--submitting--v1.svg`
- `SF-F-04--320--failed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند؛ قاب‌ها خروجی قطعی‌اند و مستقیم ویرایش نمی‌شوند.
