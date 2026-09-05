# SF-E-03 — نشانی‌های من

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/addresses`  
**Actors:** retail، wholesale-applicant، wholesale

## هدف

کار اصلی **مدیریت نشانی‌های customer-owned و پیش‌فرض** است. اقدام اصلی «افزودن نشانی» و بازیابی bounded «دریافت نسخه تازه یا تلاش دوباره» است. ترتیب محتوا نشانی پیش‌فرض ← فهرست نشانی‌ها ← افزودن/ویرایش ← حذف مشروط ← نسخه و conflict می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `first-use` | هنوز نشانی ثبت نشده است | اولین نشانی می‌تواند پس از اعتبارسنجی به‌عنوان پیش‌فرض ثبت شود. | افزودن اولین نشانی |
| `conflict` | نشانی هم‌زمان تغییر کرده است | نسخه تازه نمایش داده می‌شود و تغییر قبلی بدون بازبینی بازنویسی نمی‌شود. | بازبینی نسخه تازه |
| `failed` | ذخیره نشانی انجام نشد | اطلاعات امن فرم حفظ شده و هیچ نشانی تکراری ساخته نشده است. | تلاش دوباره برای ذخیره |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | کارت‌های تک‌ستون و ناوبری خطی | H1 → پیش‌فرض → کارت‌ها → افزودن |
| 360px | کارت تک‌ستون با متن آزادتر | H1 → پیش‌فرض → کارت‌ها → افزودن |
| 600px | دو کارت در ردیف در صورت ظرفیت | H1 → پیش‌فرض → کارت‌ها → افزودن |
| 840px | ناوبری 3 ستون و محتوا 9 ستون | H1 → ناوبری → کارت‌ها → dialog → افزودن |
| 1200px | ناوبری ثابت 3/9 | H1 → ناوبری → کارت‌ها → dialog → افزودن |
| 1440px | ناوبری ثابت 3/9 در 1280 | H1 → ناوبری → کارت‌ها → dialog → افزودن |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-06`. قابلیت‌ها: `GET /customer/addresses`، `POST /customer/addresses`، `PATCH /customer/addresses/{id}`، `DELETE /customer/addresses/{id}`، `POST /customer/addresses/{id}/set-default`. Componentها: `Card`، `Dialog`، `Button`، `StatePanel`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-03--320--first-use--v1.svg`
- `SF-E-03--1440--first-use--v1.svg`
- `SF-E-03--320--conflict--v1.svg`
- `SF-E-03--320--failed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
