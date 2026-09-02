# Step 55-E — حساب، عمده‌فروشی و خدمات پس از فروش

**وضعیت:** COMPLETE / GATE PASS — Step 55 ادامه دارد و 55-F هنوز شروع نشده است.

این پوشه خروجی Canonical کم‌جزئیات 55-E است. قرارداد `docs/13-product-design/step55-account-wholesale-after-sales-wireframes.json` منبع تولید قطعی است و generator همه قاب‌ها، companionها و manifest را می‌سازد. Repository مرجع است؛ Figma اختیاری و غیرمسدودکننده می‌ماند.

## محدوده

| شناسه | سطح | Route intent | حالت‌ها | اقدام اصلی |
|---|---|---|---|---|
| SF-E-01 | پیشخوان حساب کاربری | `/account` | initial، unauthenticated، partial | مشاهده سفارش‌های من |
| SF-E-02 | پروفایل و امنیت | `/account/profile` | validation، step-up، success | ذخیره تغییرات پروفایل |
| SF-E-03 | نشانی‌های من | `/account/addresses` | first-use، conflict، failed | افزودن نشانی |
| SF-E-04 | سفارش‌های من | `/account/orders` | initial، first-use، filtered | مشاهده جزئیات سفارش |
| SF-E-05 | جزئیات سفارش و فاکتور | `/account/orders/:order-number` | initial، denied، terminal | دریافت فاکتور سفارش |
| SF-E-06 | ابزارهای مشتری | `/account/tools` | first-use، partial، server-validation | مشاهده علاقه‌مندی‌ها |
| SF-E-07 | خرید عمده از ایکوفی | `/wholesale` | enabled، unauthenticated، disabled-with-reason | شروع درخواست عمده |
| SF-E-08 | درخواست همکاری عمده | `/account/wholesale/apply` | validation، submitting، conflict | ثبت درخواست برای بررسی |
| SF-E-09 | وضعیت درخواست عمده | `/account/wholesale` | pending، terminal، failed | مشاهده آخرین وضعیت |
| SF-E-10 | زمینه خرید عمده تأییدشده | `wholesale-commerce-state` | active، quantity-invalid، price-changed | افزودن با شرایط عمده |
| SF-E-11 | مرجوعی سفارش | `/account/returns/:return-number?` | validation، pending، terminal | ثبت درخواست مرجوعی |
| SF-E-12 | درخواست گارانتی | `/account/warranty/:claim-number?` | validation، pending، terminal | ثبت درخواست گارانتی |

جریان حساب از overview به پروفایل، نشانی، سفارش و ابزار مشتری می‌رود. عمده‌فروشی معرفی، application، status و commerce state تأییدشده را جدا نگه می‌دارد. مرجوعی و گارانتی eligibility، timeline و نتیجه authoritative دارند.

## Responsive

| عرض | Grid | حساب | رکوردها | فرم |
|---:|---|---|---|---|
| 320px | 4 ستون، حاشیه 16، فاصله 12 | کارت‌های تک‌ستون و ناوبری خطی | خلاصه رکورد پیش از جزئیات | فیلد و اقدام تمام‌عرض |
| 360px | 4 ستون، حاشیه 16، فاصله 12 | کارت تک‌ستون با متن آزادتر | فیلترها در disclosure | فیلد و اقدام تمام‌عرض |
| 600px | 8 ستون، حاشیه 24، فاصله 16 | دو کارت در ردیف در صورت ظرفیت | خلاصه و timeline عمودی | فرم bounded در 6 ستون |
| 840px | 12 ستون، حاشیه 32، فاصله 20 | ناوبری 3 ستون و محتوا 9 ستون | فهرست 5 ستون و جزئیات 7 ستون | فرم 7 ستون و راهنما 5 ستون |
| 1200px | 12 ستون، حاشیه 32، فاصله 24 | ناوبری ثابت 3/9 | master/detail bounded 4/8 | فرم 7/5 با خلاصه مستقل |
| 1440px | 12 ستون در ظرف 1280 | ناوبری ثابت 3/9 در 1280 | فهرست و detail در 1280 | فرم و راهنما در 1280 |

هر صفحه سه state compact در 320px و یک state expanded در 1440px دارد. رفتار 360/600/840/1200، zoom 400%، متن بلند فارسی، keyboard-only، error association و bidi reference در traceability ثبت است.

## مالکیت و حقیقت تجاری

- همه منابع حساب، نشانی، سفارش، علاقه‌مندی، مرجوعی و گارانتی customer-owned و session-bound هستند.
- شماره موبایل، کدپستی، شناسه پرداخت و شماره‌های مرجع فقط به‌صورت ماسک‌شده یا bidi-isolated نمایش داده می‌شوند.
- حالت denied هیچ وجود یا محتوای رکورد متعلق به کاربر دیگر را افشا نمی‌کند.
- OTP، secret، token، سند حساس و payload داخلی در URL، analytics یا پیام خطا بازتاب داده نمی‌شوند.
- Overview از read modelهای authoritative تغذیه می‌شود و partial failure را از empty state جدا می‌کند.
- سفارش، timeline، invoice و payment status از منبع مالک خود خوانده می‌شوند و UI وضعیت تازه اختراع نمی‌کند.
- لغو سفارش فقط وقتی capability authoritative اجازه دهد ارائه می‌شود و حالت terminal دلیل متنی دارد.
- فاکتور مبلغ‌های صحیح و گروه‌بندی‌شده تومان دارد و Wallet در هیچ سطحی وجود ندارد.
- متقاضی تا approval authoritative مشتری retail باقی می‌ماند و قیمت عمده زودتر نمایش داده نمی‌شود.
- ارسال درخواست عمده idempotent است و conflict به درخواست فعال موجود هدایت می‌کند.
- وضعیت pending، approved و rejected از GET application می‌آید و UI تصمیم مدیریتی نمی‌سازد.
- مشتری عمده تأییدشده قیمت و حداقل/حداکثر تعداد authoritative را می‌بیند؛ بیش از ۱۰ واحد فقط طبق quote معتبر محاسبه می‌شود.
- مرجوعی فقط برای سفارش و قلم واجد شرایط همان مشتری ساخته می‌شود و eligibility حدس زده نمی‌شود.
- گارانتی فقط با محصول، سفارش و evidence مجاز ثبت می‌شود؛ upload واقعی یا سند جعلی در وایرفریم نیست.
- pending و terminal از timeline authoritative می‌آیند و لغو فقط در وضعیت مجاز نمایش داده می‌شود.
- خطای server-validation ورودی امن را حفظ می‌کند و retry تکراری رکورد دوم نمی‌سازد.
- هر صفحه یک H1، landmark معنادار و وضعیت قابل اعلام مستقل از رنگ دارد.
- هدف تعاملی حداقل 44×44 CSS px، focus واضح و error summary مرتبط با field دارد.
- Tabs، فیلتر، timeline و status با نام و ترتیب keyboard روشن ارائه می‌شوند.
- در 400% zoom ترتیب معنایی حفظ و scroll دوبعدی صفحه ایجاد نمی‌شود.
- تاریخ، مبلغ، شماره سفارش و status در متن فارسی خوانش bidi پایدار دارند.

## مرز

55-E هیچ Runtime، Route واقعی، API، Migration، Dependency، Permission، Business Rule، فایل آپلودی، دارایی برند یا High-fidelity UI ایجاد نمی‌کند. Admin در Step 56 و Prototype در Step 57 باقی می‌مانند؛ 55-F فقط پس از بسته‌شدن این Gate مجاز است.
