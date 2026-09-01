# SF-D-02 — ورود و هویت تسویه‌حساب

**Gate:** 55-D

**Fidelity:** structural low-fidelity

**Route intent:** `/checkout/identity`

**Actors:** guest، retail، wholesale

## هدف

کار اصلی **تأیید Session و اتصال امن سبد مهمان** است. اقدام اصلی «تأیید هویت و ادامه» و بازیابی bounded «درخواست کنترل‌شده کد تازه یا بازگشت به سبد» است. اولویت محتوا مرحله checkout ← شماره موبایل ← کد OTP ← زمان/محدودیت ← merge سبد ← ادامه می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.

## ساختار و مالکیت

صفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `validation` | کد واردشده معتبر نیست | کد شش‌رقمی را بررسی کنید؛ سبد و quote امن حفظ شده‌اند و خطا به ورودی مرتبط است. | بررسی دوباره کد |
| `unauthenticated` | برای ادامه هویت خود را تأیید کنید | شماره موبایل برای دریافت OTP لازم است؛ پرداخت یا سفارش پیش از تأیید ساخته نمی‌شود. | دریافت کد ورود |
| `submitting` | در حال تأیید کد و اتصال سبد | درخواست دوم ارسال نمی‌شود؛ نتیجه Session و merge authoritative منتظر می‌ماند. | لطفاً منتظر بمانید |

ورودی امن و context معتبر در خطا حفظ می‌شود. Disabled علت دارد، submitting از تکرار جلوگیری می‌کند، expiry مسیر بازسازی می‌دهد و unknown-result فقط status check ارائه می‌کند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | هر مرحله یک task؛ اقدام زیر محتوای مرتبط | H1 → progress → mobile/OTP → error/status → primary → back |
| 360px | ورودی‌ها تمام‌عرض؛ progress متنی | H1 → progress → mobile/OTP → error/status → primary → back |
| 600px | فرم 6 ستون با راهنمای 2 ستون | H1 → progress → mobile/OTP → error/status → primary → back |
| 840px | فرم 7 ستون و خلاصه پنج ستون | H1 → progress → mobile/OTP → error/status → primary → back |
| 1200px | step content و order summary هم‌زمان | H1 → progress → mobile/OTP → error/status → primary → back |
| 1440px | نسبت‌ها ثابت و whitespace در gutter | H1 → progress → mobile/OTP → error/status → primary → back |

در 400% zoom صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px هستند؛ error summary به field مربوط است؛ تغییر جمع، انقضا و نتیجه پرداخت announce می‌شود.

## ردیابی

Journeyها: `SJ-03`، `SJ-04`. قابلیت‌ها: `POST /auth/otp/request`، `POST /auth/otp/verify`، `GET /auth/session`، `POST /customer/cart/access`، `POST /customer/cart/merge`. Componentها: `TextField`، `Button`، `Alert`. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-D-02--320--validation--v1.svg`
- `SF-D-02--1440--validation--v1.svg`
- `SF-D-02--320--unauthenticated--v1.svg`
- `SF-D-02--320--submitting--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.
