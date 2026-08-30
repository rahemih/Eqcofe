# SF-B-04 — فهرست محصولات

**Gate:** 55-B

**Fidelity:** structural low-fidelity

**Route intent:** `listing-region`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **مقایسه سریع عنوان، قیمت و موجودی جاری محصول‌ها**. اقدام اصلی «بازکردن محصول» است و مسیر بازیابی bounded با «بازخوانی قیمت و موجودی» پایان می‌یابد. اولویت محتوا به‌ترتیب خلاصه پرس‌وجو ← کارت محصول ← قیمت و موجودی authoritative ← برچسب عمده تأییدشده ← صفحه‌بندی است؛ collapse responsive این ترتیب معنایی را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55 استفاده می‌کند: skip link، utility notice واقعی، header، navigation، breadcrumb در صورت سلسله‌مراتبی‌بودن، دقیقاً یک main/H1، اقدام‌های contextual و footer. محل لوگو فقط با برچسب «نشان تأییدشده» رزرو شده و هیچ نشان تازه‌ای طراحی نشده است. رسانه محصول placeholder خنثی و برچسب‌دار است.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `progressive` | ۱۲ محصول از ۴۸ محصول آماده است | کارت‌های آماده قابل استفاده‌اند و ادامه فهرست بدون تغییر جای محتوا اضافه می‌شود. | ادامه مرور |
| `out-of-stock` | این Variant فعلاً ناموجود است | قیمت اطلاع‌رسانی است؛ اقدام خرید غیرفعال با دلیل و مسیر مشاهده محصول حفظ می‌شود. | مشاهده جزئیات |
| `price-changed` | قیمت یک محصول به‌روز شد | قیمت تازه با واحد تومان نمایش داده شده و قیمت قدیمی مبنای خرید نیست. | تأیید و ادامه |

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

Journeyها: `SJ-01`، `SJ-11`. قابلیت‌های مرجع: `GET /products`، `GET /categories/{slug}/products`، `GET /brands/{slug}/products`، `GET /auth/session`. Component familyها: `Card`، `Badge`، `Pagination`. این ارجاع‌ها capability موجود را نشان می‌دهند و وعده Provider/Runtime تازه نیستند.

## Artifactها

- `SF-B-04--320--progressive--v1.svg`
- `SF-B-04--1440--progressive--v1.svg`
- `SF-B-04--320--out-of-stock--v1.svg`
- `SF-B-04--320--price-changed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` برای بررسی ماشینی و انسانی الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش، قرارداد JSON است.
