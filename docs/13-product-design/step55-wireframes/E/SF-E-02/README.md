# SF-E-02 — پروفایل و امنیت

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/profile`  
**Actors:** retail، wholesale-applicant، wholesale

## هدف

کار اصلی **بازبینی و ویرایش امن اطلاعات مشتری** است. اقدام اصلی «ذخیره تغییرات پروفایل» و بازیابی bounded «اصلاح فیلد یا تأیید دوباره هویت» است. ترتیب محتوا وضعیت نشست ← نام و تماس ← فیلدهای قابل ویرایش ← step-up ← نتیجه ذخیره می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `validation` | اطلاعات پروفایل نیاز به اصلاح دارد | خطاها کنار فیلد و در summary آمده‌اند و مقادیر امن حفظ شده‌اند. | اصلاح موارد مشخص‌شده |
| `step-up` | تأیید هویت دوباره لازم است | برای تغییر شماره تماس یک OTP تازه لازم است و تغییر پیش از تأیید اعمال نمی‌شود. | دریافت کد تأیید |
| `success` | پروفایل به‌روز شد | نسخه authoritative تازه دریافت شد و زمان تغییر برای کاربر اعلام می‌شود. | بازگشت به حساب |

Empty، partial، validation، conflict، pending، terminal و failed معنای جدا دارند. ورودی امن در خطا حفظ می‌شود؛ submitting درخواست تکراری نمی‌سازد و recovery فقط همان منبع authoritative را دوباره می‌خواند.

## Responsive و focus

| عرض | تصمیم | ترتیب focus |
|---:|---|---|
| 320px | فیلد و اقدام تمام‌عرض | H1 → summary خطا → فیلدها → راهنما/step-up → primary → back |
| 360px | فیلد و اقدام تمام‌عرض | H1 → summary خطا → فیلدها → راهنما/step-up → primary → back |
| 600px | فرم bounded در 6 ستون | H1 → summary خطا → فیلدها → راهنما/step-up → primary → back |
| 840px | فرم 7 ستون و راهنما 5 ستون | H1 → summary خطا → فیلدها → راهنما/step-up → primary → back |
| 1200px | فرم 7/5 با خلاصه مستقل | H1 → summary خطا → فیلدها → راهنما/step-up → primary → back |
| 1440px | فرم و راهنما در 1280 | H1 → summary خطا → فیلدها → راهنما/step-up → primary → back |

در zoom 400% صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px، focus نمایان، error summary مرتبط و status announcement مستقل از رنگ هستند.

## ردیابی

Journeyها: `SJ-03`، `SJ-06`. قابلیت‌ها: `GET /auth/session`، `POST /auth/otp/request`، `POST /auth/otp/verify`، `GET /customer/profile`، `PATCH /customer/profile`. Componentها: `TextField`، `Button`، `Alert`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-02--320--validation--v1.svg`
- `SF-E-02--1440--validation--v1.svg`
- `SF-E-02--320--step-up--v1.svg`
- `SF-E-02--320--success--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
