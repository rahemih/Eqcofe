# SF-C-05 — علاقه‌مندی و هشدار محصول

**Gate:** 55-C

**Fidelity:** structural low-fidelity

**Route intent:** `product-owned-actions`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **ذخیره محصول یا ساخت هشدار با مالکیت حساب و بازخورد روشن**. اقدام اصلی «افزودن به علاقه‌مندی» است و بازیابی bounded با «ورود و ادامه همان اقدام یا تلاش کنترل‌شده» پایان می‌یابد. اولویت محتوا به‌ترتیب نام محصول ← وضعیت Session ← علاقه‌مندی ← نوع هشدار ← بازخورد mutation ← مدیریت از حساب است و collapse responsive این ترتیب را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55، دقیقاً یک main/H1 و placeholder خنثی رسانه استفاده می‌کند. حقیقت قیمت، موجودی و Variant از محصول جاری می‌آید؛ اقدام‌های علاقه‌مندی/هشدار مالک حساب‌اند و مقایسه فقط مجموعه هم‌دسته حداکثر چهارتایی را می‌پذیرد.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `unauthenticated` | برای ذخیره محصول وارد شوید | محصول و اقدام انتخابی به‌صورت امن حفظ می‌شوند؛ پس از OTP همان درخواست دوباره تأیید می‌شود. | ورود و ادامه |
| `submitting` | در حال ذخیره در علاقه‌مندی‌ها | کنترل دوباره فعال نمی‌شود تا نتیجه authoritative برسد؛ قیمت و موجودی در این منبع کپی نمی‌شوند. | لطفاً منتظر بمانید |
| `success` | محصول به علاقه‌مندی‌ها افزوده شد | مدیریت این محصول از حساب من در دسترس است؛ ثبت تکراری منبع تازه‌ای ایجاد نمی‌کند. | مشاهده علاقه‌مندی‌ها |

قیمت/موجودی stale بی‌صدا معتبر نمی‌ماند. Disabled علت متنی دارد. Mutation و ورود intent امن را حفظ می‌کنند. رسانه ناموجود با مشخصات متنی جایگزین می‌شود و مقایسه ناسازگار انتخاب‌های معتبر را حذف نمی‌کند.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | اقدام‌ها عمودی؛ Dialog تمام‌عرض و بازگشت focus به کنترل آغازگر | H1 → session status → wishlist → alert options → submit/status → account destination |
| 360px | اقدام‌ها عمودی؛ Dialog تمام‌عرض و بازگشت focus به کنترل آغازگر | H1 → session status → wishlist → alert options → submit/status → account destination |
| 600px | اقدام‌ها در دو ناحیه؛ Dialog محدود و status کنار منبع اقدام | H1 → session status → wishlist → alert options → submit/status → account destination |
| 840px | اقدام‌ها در دو ناحیه؛ Dialog محدود و status کنار منبع اقدام | H1 → session status → wishlist → alert options → submit/status → account destination |
| 1200px | اقدام‌ها در دو ناحیه؛ Dialog محدود و status کنار منبع اقدام | H1 → session status → wishlist → alert options → submit/status → account destination |
| 1440px | اقدام‌ها در دو ناحیه؛ Dialog محدود و status کنار منبع اقدام | H1 → session status → wishlist → alert options → submit/status → account destination |

در 400% zoom صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی صفحه دارد. هدف تعاملی حداقل 44×44px است؛ جدول مقایسه کارت/list معادل و رسانه کنترل قبلی/بعدی دارد. تغییر Variant، شمار مقایسه و نتیجه اقدام با status announcement بیان می‌شوند.

## ردیابی

Journeyها: `SJ-03`، `SJ-12`. قابلیت‌ها: `GET /auth/session`، `POST /auth/otp/request`، `POST /auth/otp/verify`، `GET /customer/wishlist`، `POST /customer/wishlist/{product_id}`، `DELETE /customer/wishlist/{product_id}`، `GET /customer/product-alerts`، `POST /customer/product-alerts`، `DELETE /customer/product-alerts/{id}`. Componentها: `IconButton`، `Dialog`، `Alert`. این‌ها capability موجودند و وعده Runtime تازه نیستند.

## Artifactها

- `SF-C-05--320--unauthenticated--v1.svg`
- `SF-C-05--1440--unauthenticated--v1.svg`
- `SF-C-05--320--submitting--v1.svg`
- `SF-C-05--320--success--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش قرارداد JSON است.
