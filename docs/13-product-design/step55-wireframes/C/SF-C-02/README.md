# SF-C-02 — رسانه و نمای محصول

**Gate:** 55-C

**Fidelity:** structural low-fidelity

**Route intent:** `product-media-region`

**Actors:** guest، retail، wholesale

## هدف و اولویت

کار اصلی: **بررسی رسانه موجود بدون وابستگی به gesture یا قالب خاص**. اقدام اصلی «نمایش قاب بعدی» است و بازیابی bounded با «بازگشت به اطلاعات متنی محصول» پایان می‌یابد. اولویت محتوا به‌ترتیب نوع رسانه ← قاب فعال ← شرح جایگزین ← کنترل قبلی/بعدی ← thumbnailها ← بازگشت به محصول است و collapse responsive این ترتیب را عوض نمی‌کند.

## ساختار

صفحه از shell مشترک Step 55، دقیقاً یک main/H1 و placeholder خنثی رسانه استفاده می‌کند. حقیقت قیمت، موجودی و Variant از محصول جاری می‌آید؛ اقدام‌های علاقه‌مندی/هشدار مالک حساب‌اند و مقایسه فقط مجموعه هم‌دسته حداکثر چهارتایی را می‌پذیرد.

## حالت‌ها

| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |
|---|---|---|---|
| `progressive` | رسانه اصلی آماده است | قاب اول قابل بررسی است؛ دو قاب بعدی بدون جابه‌جایی ناگهانی تکمیل می‌شوند و شرح متنی حفظ شده است. | نمایش قاب بعدی |
| `unavailable` | نمای سه‌بعدی در دسترس نیست | تصویرهای موجود و مشخصات فنی همچنان قابل استفاده‌اند؛ قابلیت تأییدنشده جایگزین یا موفق فرض نمی‌شود. | مشاهده تصویرها |
| `no-result` | رسانه‌ای برای این Variant ثبت نشده است | نام Variant و ویژگی‌های متنی معتبر باقی می‌مانند و تصمیم خرید به placeholder گمراه‌کننده وابسته نیست. | بازگشت به مشخصات |

قیمت/موجودی stale بی‌صدا معتبر نمی‌ماند. Disabled علت متنی دارد. Mutation و ورود intent امن را حفظ می‌کنند. رسانه ناموجود با مشخصات متنی جایگزین می‌شود و مقایسه ناسازگار انتخاب‌های معتبر را حذف نمی‌کند.

## رفتار responsive و focus

| عرض | تصمیم layout | ترتیب focus/عملیات |
|---:|---|---|
| 320px | قاب اصلی تمام‌عرض؛ thumbnail به‌صورت فهرست کنترل‌پذیر | H1 → tabs → viewer description → previous/next → thumbnails → return |
| 360px | tabها قابل scroll تک‌محوری با کنترل قبلی/بعدی | H1 → tabs → viewer description → previous/next → thumbnails → return |
| 600px | قاب اصلی و thumbnail کنار هم در محدوده رسانه | H1 → tabs → viewer description → previous/next → thumbnails → return |
| 840px | tabها و viewer هم‌زمان؛ dialog در عرض متوسط | H1 → tabs → viewer description → previous/next → thumbnails → return |
| 1200px | thumbnail عمودی و viewer بزرگ | H1 → tabs → viewer description → previous/next → thumbnails → return |
| 1440px | فضای اضافه فقط در gutter و viewer | H1 → tabs → viewer description → previous/next → thumbnails → return |

در 400% zoom صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی صفحه دارد. هدف تعاملی حداقل 44×44px است؛ جدول مقایسه کارت/list معادل و رسانه کنترل قبلی/بعدی دارد. تغییر Variant، شمار مقایسه و نتیجه اقدام با status announcement بیان می‌شوند.

## ردیابی

Journeyها: `SJ-01`. قابلیت‌ها: `GET /products/{slug}`. Componentها: `Tabs`، `Dialog`، `StatePanel`. این‌ها capability موجودند و وعده Runtime تازه نیستند.

## Artifactها

- `SF-C-02--320--progressive--v1.svg`
- `SF-C-02--1440--progressive--v1.svg`
- `SF-C-02--320--unavailable--v1.svg`
- `SF-C-02--320--no-result--v1.svg`

همراه‌های `traceability.json` و `acceptance.md` الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش قرارداد JSON است.
