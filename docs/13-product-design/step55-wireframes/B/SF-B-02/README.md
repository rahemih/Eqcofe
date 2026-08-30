# SF-B-02 — دسته ابزار دم‌آوری

**Gate:** 55-B

**Fidelity:** structural low-fidelity

**Route intent:** `/category/:slug`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **شناخت دسته و رسیدن به فهرست مرتبط**. اقدام اصلی «مشاهده محصولات دسته» است و مسیر بازیابی bounded با «پاک‌کردن فیلترهای دسته» پایان می‌یابد. اولویت محتوا به‌ترتیب عنوان و مسیر دسته ← زیردسته‌ها ← خلاصه نتیجه ← فهرست محصول ← صفحه‌بندی است؛ collapse responsive این ترتیب معنایی را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55 استفاده می‌کند: skip link، utility notice واقعی، header، navigation، breadcrumb در صورت سلسله‌مراتبی‌بودن، دقیقاً یک main/H1، اقدام‌های contextual و footer. محل لوگو فقط با برچسب «نشان تأییدشده» رزرو شده و هیچ نشان تازه‌ای طراحی نشده است. رسانه محصول placeholder خنثی و برچسب‌دار است.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `initial` | در حال دریافت دسته | عنوان و breadcrumb ثابت می‌مانند و فهرست با skeleton معنایی بارگذاری می‌شود. | بازخوانی دسته |
| `filtered` | ۳ فیلتر فعال | ۲۴ محصول مطابق انتخاب‌های شما نمایش داده می‌شود و حذف هر فیلتر مستقل است. | نمایش فیلترها |
| `no-result` | محصولی با این فیلترها پیدا نشد | دسته معتبر است؛ انتخاب‌ها را تغییر دهید یا همه فیلترها را پاک کنید. | پاک‌کردن همه فیلترها |

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

Journeyها: `SJ-01`. قابلیت‌های مرجع: `GET /categories/{slug}/products`، `GET /categories/{slug}/filters`. Component familyها: `Card`، `Pagination`، `StatePanel`. این ارجاع‌ها capability موجود را نشان می‌دهند و وعده Provider/Runtime تازه نیستند.

## Artifactها

- `SF-B-02--320--initial--v1.svg`
- `SF-B-02--1440--initial--v1.svg`
- `SF-B-02--320--filtered--v1.svg`
- `SF-B-02--320--no-result--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` برای بررسی ماشینی و انسانی الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش، قرارداد JSON است.
