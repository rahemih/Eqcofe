# SF-E-08 — درخواست همکاری عمده

**Gate:** 55-E  
**Fidelity:** structural low-fidelity  
**Route intent:** `/account/wholesale/apply`  
**Actors:** retail، wholesale-applicant

## هدف

کار اصلی **ثبت یک درخواست عمده معتبر و idempotent** است. اقدام اصلی «ثبت درخواست برای بررسی» و بازیابی bounded «اصلاح فیلد یا رفتن به درخواست موجود» است. ترتیب محتوا نوع کسب‌وکار ← اطلاعات تماس ← شناسه‌های لازم ← شرایط ← ارسال idempotent می‌ماند و reflow ترتیب معنایی را عوض نمی‌کند.

## مالکیت و امنیت

صفحه فقط منبع customer-owned همان Session را می‌خواند. UI نتیجه approval، eligibility، سفارش، پرداخت، مرجوعی یا گارانتی را اختراع نمی‌کند. denied وجود رکورد دیگر را افشا نمی‌کند؛ شناسه‌های Latin bidi-isolated و اطلاعات شخصی ماسک می‌شوند.

## حالت‌ها

| State | عنوان | زمینه | اقدام bounded |
|---|---|---|---|
| `validation` | اطلاعات درخواست کامل نیست | فیلدهای لازم مشخص‌اند و داده معتبر واردشده حفظ می‌شود. | تکمیل موارد مشخص‌شده |
| `submitting` | درخواست در حال ثبت است | ارسال دوم غیرفعال است تا نتیجه authoritative دریافت شود. | لطفاً منتظر بمانید |
| `conflict` | یک درخواست فعال از قبل وجود دارد | رکورد تازه ساخته نمی‌شود و کاربر به وضعیت همان درخواست هدایت می‌شود. | مشاهده درخواست موجود |

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

Journeyها: `SJ-10`. قابلیت‌ها: `POST /customer/wholesale/applications`، `GET /customer/wholesale/application`. Componentها: `TextField`، `Select`، `Button`، `Alert`. این‌ها capability موجودند، نه وعده Runtime تازه.

## Artifactها

- `SF-E-08--320--validation--v1.svg`
- `SF-E-08--1440--validation--v1.svg`
- `SF-E-08--320--submitting--v1.svg`
- `SF-E-08--320--conflict--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. قاب‌ها خروجی قطعی هستند و مستقیم ویرایش نمی‌شوند.
