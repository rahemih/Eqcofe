# SF-E-07 — خرید عمده از ایکوفی

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/wholesale`  
**Actors:** guest، retail، wholesale-applicant

## هدف

کار اصلی **فهم شرایط و ورود امن به درخواست عمده** است. اقدام اصلی «شروع درخواست عمده» و بازیابی bounded «ورود به حساب یا مشاهده وضعیت موجود» است. ترتیب محتوا مزایا بدون وعده ساختگی ← شرایط ← فرایند بررسی ← CTA ← وضعیت درخواست موجود می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `enabled` | درخواست خرید عمده در دسترس است | شرایط و فرایند بررسی روشن‌اند؛ approval یا تخفیف پیش از تصمیم تضمین نمی‌شود. | شروع درخواست عمده |
| `unauthenticated` | برای درخواست وارد حساب شوید | پس از OTP به همین مسیر بازمی‌گردید و درخواست ناشناس ساخته نمی‌شود. | ورود و ادامه |
| `disabled-with-reason` | درخواست فعال دیگری دارید | فرم دوم ساخته نمی‌شود و وضعیت authoritative درخواست موجود در دسترس است. | مشاهده وضعیت درخواست |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | فیلد و اقدام تمام‌عرض | H1 → وضعیت حساب → شرایط/قیمت → تعداد → quote → primary |
| 360px | فیلد و اقدام تمام‌عرض | H1 → وضعیت حساب → شرایط/قیمت → تعداد → quote → primary |
| 600px | فرم bounded در 6 ستون | H1 → وضعیت حساب → شرایط/قیمت → تعداد → quote → primary |
| 840px | فرم 7 ستون و راهنما 5 ستون | H1 → وضعیت حساب → شرایط/قیمت → تعداد → quote → primary |
| 1200px | فرم 7/5 با خلاصه مستقل | H1 → وضعیت حساب → شرایط/قیمت → تعداد → quote → primary |
| 1440px | فرم و راهنما در 1280 | H1 → وضعیت حساب → شرایط/قیمت → تعداد → quote → primary |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-10`. قابلیت‌ها: `GET /customer/wholesale/application`. Componentها: `Card`، `Button`، `StatePanel`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-07--320--enabled--v1.svg`
- `SF-E-07--1440--enabled--v1.svg`
- `SF-E-07--320--unauthenticated--v1.svg`
- `SF-E-07--320--disabled-with-reason--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
