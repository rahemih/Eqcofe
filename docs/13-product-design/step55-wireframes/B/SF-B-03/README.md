# SF-B-03 — نتایج جست‌وجوی «آسیاب دستی»

**Gate:** 55-B

**Fidelity:** structural low-fidelity

**Route intent:** `/search?q=`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **اصلاح عبارت و ارزیابی نتایج جست‌وجو**. اقدام اصلی «جست‌وجوی دوباره» است و مسیر بازیابی bounded با «حفظ عبارت و تلاش دوباره» پایان می‌یابد. اولویت محتوا به‌ترتیب عبارت جست‌وجو ← تعداد نتیجه ← پیشنهاد اصلاح ← فهرست محصول ← صفحه‌بندی است؛ collapse responsive این ترتیب معنایی را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55 استفاده می‌کند: skip link، utility notice واقعی، header، navigation، breadcrumb در صورت سلسله‌مراتبی‌بودن، دقیقاً یک main/H1، اقدام‌های contextual و footer. محل لوگو فقط با برچسب «نشان تأییدشده» رزرو شده و هیچ نشان تازه‌ای طراحی نشده است. رسانه محصول placeholder خنثی و برچسب‌دار است.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `initial` | در حال جست‌وجوی «آسیاب دستی» | عبارت، کنترل‌ها و جای صفحه حفظ می‌شوند تا نتیجه authoritative برسد. | توقف لازم نیست |
| `no-result` | برای «آسیاب دستی مسافرتی خیلی کوچک» نتیجه‌ای نبود | املای عبارت را بررسی کنید، واژه‌های کمتر بنویسید یا یک دسته مرتبط را باز کنید. | جست‌وجوی «آسیاب دستی» |
| `offline` | اتصال اینترنت برقرار نیست | عبارت شما حفظ شده است. پس از اتصال، همان جست‌وجو را بدون ثبت دوباره اجرا کنید. | تلاش دوباره |

حالت loading/refresh زمینه پرس‌وجو را حفظ می‌کند. Empty واقعی با filtered/no-result یکی نیست. Disabled همیشه دلیل متنی دارد. قیمت/موجودی stale با داده تازه جایگزین و تغییر آن اعلام می‌شود؛ موفقیت یا موجودی فرض نمی‌شود.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | عنوان/پرس‌وجو تک‌ستونه؛ یک ستون; فیلتر disclosure | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 360px | عنوان/پرس‌وجو تک‌ستونه؛ یک ستون; فیلتر disclosure | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 600px | دو ستون; خلاصه فیلتر بالای فهرست | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 840px | سه ستون؛ فیلتر کنار محتوا; aside سه‌ستونه | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 1200px | چهار ستون؛ فیلتر کنار محتوا; aside سه‌ستونه | H1 → query/filter summary → primary content in reading order → pagination → footer |
| 1440px | چهار ستون؛ فضای بیشتر فقط در gutter; aside سه‌ستونه | H1 → query/filter summary → primary content in reading order → pagination → footer |

در 400% zoom، صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی دارد؛ هیچ محتوای ضروری روی hover نیست. حداقل هدف 44×44px است. Focus ابتدا به main می‌پرد، سپس عنوان/پرس‌وجو، کنترل‌های محدودکننده، محتوای اصلی، صفحه‌بندی و footer را طی می‌کند. تغییر نتیجه با status announcement و خطا با heading و اقدام مشخص اعلام می‌شود.

## ردیابی

Journeyها: `SJ-01`. قابلیت‌های مرجع: `GET /search`، `GET /search/suggestions`. Component familyها: `TextField`، `Card`، `Pagination`، `StatePanel`. این ارجاع‌ها capability موجود را نشان می‌دهند و وعده Provider/Runtime تازه نیستند.

## Artifactها

- `SF-B-03--320--initial--v1.svg`
- `SF-B-03--1440--initial--v1.svg`
- `SF-B-03--320--no-result--v1.svg`
- `SF-B-03--320--offline--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` برای بررسی ماشینی و انسانی الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش، قرارداد JSON است.
