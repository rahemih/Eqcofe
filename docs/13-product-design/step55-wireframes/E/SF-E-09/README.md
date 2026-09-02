# SF-E-09 — وضعیت درخواست عمده

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/wholesale`  
**Actors:** wholesale-applicant، retail

## هدف

کار اصلی **پیگیری تصمیم authoritative درخواست عمده** است. اقدام اصلی «مشاهده آخرین وضعیت» و بازیابی bounded «تلاش دوباره یا بازگشت به حساب» است. ترتیب محتوا وضعیت ← شماره درخواست ← timeline خلاصه ← دلیل امن ← اقدام بعد می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `pending` | درخواست در حال بررسی است | هیچ زمان یا نتیجه‌ای حدس زده نمی‌شود؛ آخرین به‌روزرسانی authoritative نمایش داده می‌شود. | بازگشت به حساب |
| `terminal` | بررسی درخواست پایان یافته است | نتیجه approved یا rejected با توضیح مجاز و اقدام بعد نمایش داده می‌شود. | مشاهده نتیجه و شرایط |
| `failed` | وضعیت درخواست دریافت نشد | نتیجه ساختگی نمایش داده نمی‌شود و retry فقط همان رکورد را می‌خواند. | تلاش دوباره |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | خلاصه رکورد پیش از جزئیات | H1 → badge وضعیت → مرجع → timeline → اقدام بعد |
| 360px | فیلترها در disclosure | H1 → badge وضعیت → مرجع → timeline → اقدام بعد |
| 600px | خلاصه و timeline عمودی | H1 → badge وضعیت → مرجع → timeline → اقدام بعد |
| 840px | فهرست 5 ستون و جزئیات 7 ستون | H1 → badge وضعیت → مرجع → timeline → اقدام بعد |
| 1200px | master/detail bounded 4/8 | H1 → badge وضعیت → مرجع → timeline → اقدام بعد |
| 1440px | فهرست و detail در 1280 | H1 → badge وضعیت → مرجع → timeline → اقدام بعد |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-10`. قابلیت‌ها: `GET /customer/wholesale/application`. Componentها: `StatePanel`، `Badge`، `Alert`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-09--320--pending--v1.svg`
- `SF-E-09--1440--pending--v1.svg`
- `SF-E-09--320--terminal--v1.svg`
- `SF-E-09--320--failed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
