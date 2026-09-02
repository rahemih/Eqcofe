# SF-E-05 — جزئیات سفارش و فاکتور

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/orders/:order-number`  
**Actors:** retail، wholesale

## هدف

کار اصلی **دیدن حقیقت سفارش، timeline و فاکتور** است. اقدام اصلی «دریافت فاکتور سفارش» و بازیابی bounded «بررسی وضعیت یا تماس با پشتیبانی با مرجع» است. ترتیب محتوا شماره و وضعیت ← اقلام ← پرداخت ← ارسال ← timeline ← فاکتور و اقدام مجاز می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `initial` | جزئیات سفارش آماده است | اقلام، پرداخت، ارسال و فاکتور از منابع authoritative همان سفارش آمده‌اند. | دریافت فاکتور |
| `denied` | دسترسی به این سفارش مجاز نیست | وجود یا محتوای سفارش دیگر افشا نمی‌شود و مسیر امن حساب باقی می‌ماند. | بازگشت به سفارش‌های من |
| `terminal` | این سفارش در وضعیت نهایی است | لغو دیگر مجاز نیست؛ timeline و مسیر مرجوعی یا گارانتی واجد شرایط نمایش داده می‌شود. | بررسی خدمات پس از فروش |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | خلاصه رکورد پیش از جزئیات | H1 → status → اقلام → پرداخت/ارسال → timeline → فاکتور/اقدام |
| 360px | فیلترها در disclosure | H1 → status → اقلام → پرداخت/ارسال → timeline → فاکتور/اقدام |
| 600px | خلاصه و timeline عمودی | H1 → status → اقلام → پرداخت/ارسال → timeline → فاکتور/اقدام |
| 840px | فهرست 5 ستون و جزئیات 7 ستون | H1 → status → اقلام → پرداخت/ارسال → timeline → فاکتور/اقدام |
| 1200px | master/detail bounded 4/8 | H1 → status → اقلام → پرداخت/ارسال → timeline → فاکتور/اقدام |
| 1440px | فهرست و detail در 1280 | H1 → status → اقلام → پرداخت/ارسال → timeline → فاکتور/اقدام |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-05`، `SJ-07`، `SJ-08`، `SJ-09`. قابلیت‌ها: `GET /customer/orders/{order_number}`، `GET /customer/orders/{order_number}/timeline`، `GET /customer/orders/{order_number}/invoice`، `POST /customer/orders/{order_number}/cancel`، `GET /customer/orders/{order_number}/payments/{payment_id}`. Componentها: `Card`، `Badge`، `Alert`، `Button`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-05--320--initial--v1.svg`
- `SF-E-05--1440--initial--v1.svg`
- `SF-E-05--320--denied--v1.svg`
- `SF-E-05--320--terminal--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
