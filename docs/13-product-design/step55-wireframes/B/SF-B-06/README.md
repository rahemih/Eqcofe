# SF-B-06 — بازیابی مسیر کشف محصول

**Gate:** 55-B

**Fidelity:** structural low-fidelity

**Route intent:** `listing-state`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **بازگشت کنترل‌شده از نتیجه خالی یا خطای موقت**. اقدام اصلی «تلاش دوباره» است و مسیر بازیابی bounded با «پاک‌کردن فیلتر یا بازگشت به دسته‌ها» پایان می‌یابد. اولویت محتوا به‌ترتیب عنوان دقیق وضعیت ← زمینه حفظ‌شده ← اقدام bounded ← مسیر جایگزین ← شناسه پیگیری در صورت وجود است؛ collapse responsive این ترتیب معنایی را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55 استفاده می‌کند: skip link، utility notice واقعی، header، navigation، breadcrumb در صورت سلسله‌مراتبی‌بودن، دقیقاً یک main/H1، اقدام‌های contextual و footer. محل لوگو فقط با برچسب «نشان تأییدشده» رزرو شده و هیچ نشان تازه‌ای طراحی نشده است. رسانه محصول placeholder خنثی و برچسب‌دار است.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `no-result` | نتیجه‌ای مطابق انتخاب‌ها نیست | عبارت و دسته معتبرند؛ فقط فیلترهای فعلی نتیجه را خالی کرده‌اند. | پاک‌کردن همه فیلترها |
| `timeout` | دریافت نتیجه بیشتر از حد معمول طول کشید | وضعیت قبلی حفظ شده است. یک تلاش کنترل‌شده انجام دهید یا به فهرست قبلی برگردید. | تلاش دوباره |
| `failed` | نمایش محصولات ممکن نشد | موفقیت فرض نمی‌شود. عبارت، دسته و فیلترها حفظ شده‌اند و مرجع خطا برای پشتیبانی قابل کپی است. | بازخوانی نتایج |

حالت loading/refresh زمینه پرس‌وجو را حفظ می‌کند. Empty واقعی با filtered/no-result یکی نیست. Disabled همیشه دلیل متنی دارد. قیمت/موجودی stale با داده تازه جایگزین و تغییر آن اعلام می‌شود؛ موفقیت یا موجودی فرض نمی‌شود.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | StatePanel تک‌ستونه؛ اقدام‌ها تمام‌عرض و پشت‌سرهم | state heading → preserved context → primary recovery → alternative route → footer |
| 360px | StatePanel تک‌ستونه؛ اقدام‌ها تمام‌عرض و پشت‌سرهم | state heading → preserved context → primary recovery → alternative route → footer |
| 600px | StatePanel تک‌ستونه؛ اقدام‌ها تمام‌عرض و پشت‌سرهم | state heading → preserved context → primary recovery → alternative route → footer |
| 840px | StatePanel حداکثر 8 ستون؛ اقدام اصلی و جایگزین کنار هم | state heading → preserved context → primary recovery → alternative route → footer |
| 1200px | StatePanel حداکثر 8 ستون؛ اقدام اصلی و جایگزین کنار هم | state heading → preserved context → primary recovery → alternative route → footer |
| 1440px | StatePanel حداکثر 8 ستون؛ اقدام اصلی و جایگزین کنار هم | state heading → preserved context → primary recovery → alternative route → footer |

در 400% zoom، صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی دارد؛ هیچ محتوای ضروری روی hover نیست. حداقل هدف 44×44px است. Focus ابتدا به main می‌پرد، سپس عنوان/پرس‌وجو، کنترل‌های محدودکننده، محتوای اصلی، صفحه‌بندی و footer را طی می‌کند. تغییر نتیجه با status announcement و خطا با heading و اقدام مشخص اعلام می‌شود.

## ردیابی

Journeyها: `SJ-01`. قابلیت‌های مرجع: `GET /products`، `GET /search`، `GET /categories/{slug}/products`. Component familyها: `StatePanel`، `Button`. این ارجاع‌ها capability موجود را نشان می‌دهند و وعده Provider/Runtime تازه نیستند.

## Artifactها

- `SF-B-06--320--no-result--v1.svg`
- `SF-B-06--1440--no-result--v1.svg`
- `SF-B-06--320--timeout--v1.svg`
- `SF-B-06--320--failed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` برای بررسی ماشینی و انسانی الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش، قرارداد JSON است.
