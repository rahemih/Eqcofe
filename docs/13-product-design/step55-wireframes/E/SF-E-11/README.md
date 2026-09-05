# SF-E-11 — مرجوعی سفارش

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/returns/:return-number?`  
**Actors:** retail، wholesale

## هدف

کار اصلی **ثبت یا پیگیری مرجوعی واجد شرایط** است. اقدام اصلی «ثبت درخواست مرجوعی» و بازیابی bounded «اصلاح درخواست یا پیگیری همان پرونده» است. ترتیب محتوا سفارش/قلم واجد شرایط ← دلیل ← جزئیات امن ← وضعیت ← timeline ← لغو مجاز می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `validation` | درخواست مرجوعی نیاز به اصلاح دارد | قلم، تعداد یا دلیل معتبر نیست؛ eligibility authoritative و خطا مرتبط نمایش داده می‌شود. | اصلاح درخواست |
| `pending` | مرجوعی در حال بررسی است | شماره مرجوعی RT-1052 و timeline همان پرونده بدون نتیجه‌سازی نمایش داده می‌شوند. | مشاهده timeline |
| `terminal` | پرونده مرجوعی بسته شده است | نتیجه نهایی و اقدام مجاز بعدی نمایش داده می‌شود؛ لغو دیگر ارائه نمی‌شود. | بازگشت به سفارش |

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

Journeyها: `SJ-08`. قابلیت‌ها: `POST /customer/orders/{order_number}/returns`، `GET /customer/returns`، `GET /customer/returns/{return_number}`، `GET /customer/returns/{return_number}/timeline`، `POST /customer/returns/{return_number}/cancel`. Componentها: `TextField`، `Card`، `Badge`، `StatePanel`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-11--320--validation--v1.svg`
- `SF-E-11--1440--validation--v1.svg`
- `SF-E-11--320--pending--v1.svg`
- `SF-E-11--320--terminal--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
