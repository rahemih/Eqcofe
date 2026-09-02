# SF-E-10 — زمینه خرید عمده تأییدشده

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `wholesale-commerce-state`  
**Actors:** wholesale

## هدف

کار اصلی **خرید با قیمت و تعداد عمده authoritative** است. اقدام اصلی «افزودن با شرایط عمده» و بازیابی bounded «اصلاح تعداد یا دریافت quote تازه» است. ترتیب محتوا نشان تأیید عمده ← قیمت عمده ← حداقل/موجودی ← تخفیف تعداد ← quote تومان ← checkout می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `active` | حساب عمده فعال است | قیمت و محدودیت تعداد از Session، محصول و quote authoritative آمده‌اند. | افزودن به سبد عمده |
| `quantity-invalid` | تعداد عمده معتبر نیست | حداقل یا موجودی فعلی رعایت نشده و ادامه تا اصلاح تعداد غیرفعال است. | اصلاح تعداد سفارش |
| `price-changed` | quote عمده به‌روز شد | جمع و تخفیف تازه به تومان پیش از ادامه باید بازبینی شود. | تأیید quote تازه |

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

Journeyها: `SJ-11`. قابلیت‌ها: `GET /auth/session`، `GET /products/{slug}`، `POST /cart/{id}/quote`، `POST /checkout/{id}/reserve`، `POST /checkout/{id}/order`. Componentها: `Badge`، `Alert`، `Card`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-10--320--active--v1.svg`
- `SF-E-10--1440--active--v1.svg`
- `SF-E-10--320--quantity-invalid--v1.svg`
- `SF-E-10--320--price-changed--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
