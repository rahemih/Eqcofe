# SF-E-04 — سفارش‌های من

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/orders`  
**Actors:** retail، wholesale

## هدف

کار اصلی **پیدا کردن و پیگیری سفارش customer-owned** است. اقدام اصلی «مشاهده جزئیات سفارش» و بازیابی bounded «پاک‌کردن فیلتر یا تلاش دوباره» است. ترتیب محتوا شماره و تاریخ ← وضعیت ← جمع تومان ← ارسال/پرداخت ← فیلتر ← صفحه‌بندی می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `initial` | سفارش‌ها آماده‌اند | فهرست صفحه‌بندی‌شده با وضعیت و جمع authoritative نمایش داده می‌شود. | مشاهده سفارش EQ-14052 |
| `first-use` | هنوز سفارشی ندارید | این empty state با خطای دریافت متفاوت است و مسیر محصولات را ارائه می‌کند. | مشاهده محصولات |
| `filtered` | سفارشی با این فیلتر پیدا نشد | تاریخ و وضعیت انتخاب‌شده حفظ شده‌اند و پاک‌کردن فیلتر bounded است. | پاک‌کردن فیلترها |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | خلاصه رکورد پیش از جزئیات | H1 → فیلتر → نتیجه‌ها → جزئیات → pagination |
| 360px | فیلترها در disclosure | H1 → فیلتر → نتیجه‌ها → جزئیات → pagination |
| 600px | خلاصه و timeline عمودی | H1 → فیلتر → نتیجه‌ها → جزئیات → pagination |
| 840px | فهرست 5 ستون و جزئیات 7 ستون | H1 → فیلتر → نتیجه‌ها → جزئیات → pagination |
| 1200px | master/detail bounded 4/8 | H1 → فیلتر → نتیجه‌ها → جزئیات → pagination |
| 1440px | فهرست و detail در 1280 | H1 → فیلتر → نتیجه‌ها → جزئیات → pagination |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-07`. قابلیت‌ها: `GET /customer/orders`. Componentها: `Card`، `Pagination`، `StatePanel`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-04--320--initial--v1.svg`
- `SF-E-04--1440--initial--v1.svg`
- `SF-E-04--320--first-use--v1.svg`
- `SF-E-04--320--filtered--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
