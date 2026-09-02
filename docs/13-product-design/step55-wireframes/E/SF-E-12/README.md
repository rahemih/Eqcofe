# SF-E-12 — درخواست گارانتی

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/warranty/:claim-number?`  
**Actors:** retail، wholesale

## هدف

کار اصلی **ثبت یا پیگیری پرونده گارانتی معتبر** است. اقدام اصلی «ثبت درخواست گارانتی» و بازیابی bounded «اصلاح داده یا پیگیری همان پرونده» است. ترتیب محتوا محصول/سفارش ← شرح ایراد ← evidence مجاز ← شماره پرونده ← timeline ← اقدام بعد می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `validation` | اطلاعات گارانتی کامل نیست | محصول، سفارش یا شرح ایراد باید اصلاح شود؛ ورودی امن حفظ می‌ماند. | تکمیل درخواست |
| `pending` | پرونده گارانتی در حال بررسی است | شماره WR-0841 و آخرین رویداد authoritative نمایش داده می‌شوند. | مشاهده timeline |
| `terminal` | بررسی گارانتی پایان یافته است | نتیجه نهایی و مسیر پشتیبانی مرتبط بدون وعده خارج از قرارداد نمایش داده می‌شود. | مشاهده نتیجه پرونده |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | خلاصه رکورد پیش از جزئیات | H1 → eligibility/status → فیلد یا timeline → error/result → primary |
| 360px | فیلترها در disclosure | H1 → eligibility/status → فیلد یا timeline → error/result → primary |
| 600px | خلاصه و timeline عمودی | H1 → eligibility/status → فیلد یا timeline → error/result → primary |
| 840px | فهرست 5 ستون و جزئیات 7 ستون | H1 → eligibility/status → فیلد یا timeline → error/result → primary |
| 1200px | master/detail bounded 4/8 | H1 → eligibility/status → فیلد یا timeline → error/result → primary |
| 1440px | فهرست و detail در 1280 | H1 → eligibility/status → فیلد یا timeline → error/result → primary |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-09`. قابلیت‌ها: `POST /customer/warranty/claims`، `GET /customer/warranty/claims`، `GET /customer/warranty/claims/{claim_number}`، `GET /customer/warranty/claims/{claim_number}/timeline`. Componentها: `TextField`، `Card`، `Badge`، `StatePanel`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-12--320--validation--v1.svg`
- `SF-E-12--1440--validation--v1.svg`
- `SF-E-12--320--pending--v1.svg`
- `SF-E-12--320--terminal--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
