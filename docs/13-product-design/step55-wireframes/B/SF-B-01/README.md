# SF-B-01 — خانه و ورودی خرید

**Gate:** 55-B

**Fidelity:** structural low-fidelity

**Route intent:** `/`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **شروع کشف محصول از جست‌وجو یا دسته‌بندی**. اقدام اصلی «جست‌وجوی محصول» است و مسیر بازیابی bounded با «مشاهده همه دسته‌ها» پایان می‌یابد. اولویت محتوا به‌ترتیب جست‌وجو ← دسته‌های اصلی ← محصول‌های منتخب ← راهنمای خرید است؛ collapse responsive این ترتیب معنایی را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55 استفاده می‌کند: skip link، utility notice واقعی، header، navigation، breadcrumb در صورت سلسله‌مراتبی‌بودن، دقیقاً یک main/H1، اقدام‌های contextual و footer. محل لوگو فقط با برچسب «نشان تأییدشده» رزرو شده و هیچ نشان تازه‌ای طراحی نشده است. رسانه محصول placeholder خنثی و برچسب‌دار است.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `initial` | در حال آماده‌سازی خانه | ساختار صفحه فوری است و محتوای پویا با placeholder معنایی تکمیل می‌شود. | ادامه مرور دسته‌ها |
| `progressive` | محصول‌ها در حال تکمیل‌اند | دسته‌ها قابل استفاده‌اند؛ بخش محصول‌های منتخب بدون جابه‌جایی ناگهانی تکمیل می‌شود. | مشاهده همه محصولات |
| `no-result` | محصول پیشنهادی در دسترس نیست | این بخش خالی است؛ جست‌وجو و دسته‌بندی‌ها همچنان مسیر معتبر کشف محصول هستند. | رفتن به فروشگاه |

حالت loading/refresh زمینه پرس‌وجو را حفظ می‌کند. Empty واقعی با filtered/no-result یکی نیست. Disabled همیشه دلیل متنی دارد. قیمت/موجودی stale با داده تازه جایگزین و تغییر آن اعلام می‌شود؛ موفقیت یا موجودی فرض نمی‌شود.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | جست‌وجو تمام‌عرض؛ دسته‌ها 2 ستونه؛ محصول یک‌ستونه | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 360px | جست‌وجو تمام‌عرض؛ دسته‌ها 2 ستونه؛ محصول یک‌ستونه | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 600px | دسته‌ها 4 ستونه؛ محصول دو ستونه | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 840px | intro و جست‌وجو روی grid؛ محصول سه ستون؛ فیلتر کنار محتوا | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 1200px | intro و جست‌وجو روی grid؛ محصول چهار ستون؛ فیلتر کنار محتوا | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 1440px | intro و جست‌وجو روی grid؛ محصول چهار ستون؛ فضای بیشتر فقط در gutter | H1 → query/filter summary → primary content in reading order → pagination → footer |

در 400% zoom، صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی دارد؛ هیچ محتوای ضروری روی hover نیست. حداقل هدف 44×44px است. Focus ابتدا به main می‌پرد، سپس عنوان/پرس‌وجو، کنترل‌های محدودکننده، محتوای اصلی، صفحه‌بندی و footer را طی می‌کند. تغییر نتیجه با status announcement و خطا با heading و اقدام مشخص اعلام می‌شود.

## ردیابی

Journeyها: `SJ-01`. قابلیت‌های مرجع: `GET /products`، `GET /search/suggestions`. Component familyها: `Card`، `Button`، `StatePanel`. این ارجاع‌ها capability موجود را نشان می‌دهند و وعده Provider/Runtime تازه نیستند.

## Artifactها

- `SF-B-01--320--initial--v1.svg`
- `SF-B-01--1440--initial--v1.svg`
- `SF-B-01--320--progressive--v1.svg`
- `SF-B-01--320--no-result--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` برای بررسی ماشینی و انسانی الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش، قرارداد JSON است.
