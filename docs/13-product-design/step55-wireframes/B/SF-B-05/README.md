# SF-B-05 — فیلتر و مرتب‌سازی محصولات

**Gate:** 55-B

**Fidelity:** structural low-fidelity

**Route intent:** `listing-query-state`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **محدودکردن فهرست بدون ازدست‌دادن پرس‌وجو و جای صفحه**. اقدام اصلی «اعمال ۳ فیلتر» است و مسیر بازیابی bounded با «پاک‌کردن انتخاب ناسازگار» پایان می‌یابد. اولویت محتوا به‌ترتیب تعداد انتخاب‌ها ← مرتب‌سازی ← موجودی ← برند ← بازه قیمت تومان ← اعمال/پاک‌کردن است؛ collapse responsive این ترتیب معنایی را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55 استفاده می‌کند: skip link، utility notice واقعی، header، navigation، breadcrumb در صورت سلسله‌مراتبی‌بودن، دقیقاً یک main/H1، اقدام‌های contextual و footer. محل لوگو فقط با برچسب «نشان تأییدشده» رزرو شده و هیچ نشان تازه‌ای طراحی نشده است. رسانه محصول placeholder خنثی و برچسب‌دار است.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `enabled` | فیلترها آماده‌اند | هر گروه legend روشن دارد و شمار نتیجه پیش از اعمال به‌صورت status اعلام می‌شود. | اعمال ۳ فیلتر |
| `disabled-with-reason` | بازه قیمت فعلاً قابل انتخاب نیست | داده معتبر این فیلتر دریافت نشده است؛ سایر فیلترها قابل استفاده‌اند و علت کنار کنترل نوشته شده. | تلاش دوباره برای قیمت |
| `filtered` | ۳ فیلتر اعمال شد | برند، موجودی و بازه قیمت در خلاصه بالای نتایج باقی می‌ماند و هر مورد جداگانه حذف می‌شود. | مشاهده ۲۴ محصول |

حالت loading/refresh زمینه پرس‌وجو را حفظ می‌کند. Empty واقعی با filtered/no-result یکی نیست. Disabled همیشه دلیل متنی دارد. قیمت/موجودی stale با داده تازه جایگزین و تغییر آن اعلام می‌شود؛ موفقیت یا موجودی فرض نمی‌شود.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | کنترل‌ها در drawer تمام‌قد؛ اقدام اعمال sticky با فضای امن | trigger → drawer heading → sort → groups → clear → apply → trigger |
| 360px | کنترل‌ها در drawer تمام‌قد؛ اقدام اعمال sticky با فضای امن | trigger → drawer heading → sort → groups → clear → apply → trigger |
| 600px | کنترل‌ها در drawer با خلاصه انتخاب‌ها؛ اقدام اعمال sticky با فضای امن | trigger → drawer heading → sort → groups → clear → apply → trigger |
| 840px | aside سه‌ستونه کنار فهرست؛ خلاصه انتخاب‌ها بالای نتایج | summary → sort → filter groups → clear/apply → first product |
| 1200px | aside سه‌ستونه کنار فهرست؛ خلاصه انتخاب‌ها بالای نتایج | summary → sort → filter groups → clear/apply → first product |
| 1440px | aside سه‌ستونه کنار فهرست؛ خلاصه انتخاب‌ها بالای نتایج | summary → sort → filter groups → clear/apply → first product |

در 400% zoom، صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی دارد؛ هیچ محتوای ضروری روی hover نیست. حداقل هدف 44×44px است. Focus ابتدا به main می‌پرد، سپس عنوان/پرس‌وجو، کنترل‌های محدودکننده، محتوای اصلی، صفحه‌بندی و footer را طی می‌کند. تغییر نتیجه با status announcement و خطا با heading و اقدام مشخص اعلام می‌شود.

## ردیابی

Journeyها: `SJ-01`. قابلیت‌های مرجع: `GET /products`، `GET /categories/{slug}/filters`. Component familyها: `Select`، `ChoiceControl`، `Button`. این ارجاع‌ها capability موجود را نشان می‌دهند و وعده Provider/Runtime تازه نیستند.

## Artifactها

- `SF-B-05--320--enabled--v1.svg`
- `SF-B-05--1440--enabled--v1.svg`
- `SF-B-05--320--disabled-with-reason--v1.svg`
- `SF-B-05--320--filtered--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` برای بررسی ماشینی و انسانی الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش، قرارداد JSON است.
