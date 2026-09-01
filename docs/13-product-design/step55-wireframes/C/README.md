# Step 55-C — وایرفریم ارزیابی محصول

**وضعیت:** COMPLETE / GATE PASS — Step 55 ادامه دارد و 55-D هنوز شروع نشده است.

این پوشه خروجی Canonical و کم‌جزئیات 55-C است. قرارداد ماشین‌خوان `docs/13-product-design/step55-product-evaluation-wireframes.json` منبع تولید قطعی است؛ فایل‌های SVG، ردیابی و پذیرش با اسکریپت تولید می‌شوند. Figma فقط Mirror اختیاری رایگان است و نبود آن Gate را مسدود نمی‌کند.

## محدوده تثبیت‌شده

| شناسه | صفحه/ناحیه | Route intent | حالت‌های الزامی | اقدام اصلی |
|---|---|---|---|---|
| SF-C-01 | آسیاب دستی حرفه‌ای مدل E-Q40 | `/product/:slug` | initial، out-of-stock، price-changed | انتخاب مدل و ادامه |
| SF-C-02 | رسانه و نمای محصول | `product-media-region` | progressive، unavailable، no-result | نمایش قاب بعدی |
| SF-C-03 | انتخاب برای مقایسه | `compare-selection-state` | enabled، disabled-with-reason، validation | مقایسه ۲ محصول |
| SF-C-04 | مقایسه آسیاب‌های دستی | `/compare` | initial، first-use، conflict | مشاهده محصول منتخب |
| SF-C-05 | علاقه‌مندی و هشدار محصول | `product-owned-actions` | unauthenticated، submitting، success | افزودن به علاقه‌مندی |

مسیر اصلی از Product Listing وارد جزئیات و رسانه می‌شود، سپس مقایسه یا اقدام customer-owned را ممکن می‌کند و فقط Variant معتبر را به Cart در 55-D تحویل می‌دهد. مقایسه به چهار محصول هم‌دسته محدود است و خطا، قیمت یا موجودی قدیمی موفقیت تلقی نمی‌شود.

## ماتریس responsive

| عرض | Grid | Product detail | Media | Compare |
|---:|---|---|---|---|
| 320px | 4 columns / 16 margin / 16 gutter | رسانه، عنوان، حقیقت تجاری و Variant به‌ترتیب عمودی | قاب اصلی تمام‌عرض؛ thumbnail به‌صورت فهرست کنترل‌پذیر | کارت ویژگی عمودی؛ بدون جدول دوبعدی |
| 360px | 4 columns / 16 margin / 16 gutter | همان ترتیب 320 با فضای متن بیشتر و اقدام sticky بدون پوشاندن focus | tabها قابل scroll تک‌محوری با کنترل قبلی/بعدی | کارت محصول با حذف مستقیم و شمارش ۴تایی |
| 600px | 8 columns / 24 margin / 24 gutter | رسانه بالا و پنل اطلاعات دو ناحیه زیر آن | قاب اصلی و thumbnail کنار هم در محدوده رسانه | دو کارت در هر ردیف؛ ویژگی‌ها در list متناظر |
| 840px | 12 columns / 32 margin / 24 gutter | رسانه ۷ ستون و اطلاعات/Variant پنج ستون | tabها و viewer هم‌زمان؛ dialog در عرض متوسط | جدول با ستون عنوان sticky و scroll افقی bounded |
| 1200px | 12 columns / 32 margin / 24 gutter | رسانه ۷ ستون و اطلاعات پنج ستون با خلاصه اقدام | thumbnail عمودی و viewer بزرگ | حداکثر چهار ستون محصول؛ عنوان ویژگی sticky |
| 1440px | 12 columns / 32 margin / 24 gutter; content max 1280 | محتوا در 1280px مرکزی؛ نسبت 7/5 حفظ می‌شود | فضای اضافه فقط در gutter و viewer | چهار محصول در محدوده 1280؛ کارت جایگزین همچنان موجود |

هر صفحه سه حالت compact در 320px و یک قاب expanded در 1440px دارد. عرض‌های 360، 600، 840 و 1200، به‌علاوه 400% zoom، متن بلند فارسی، keyboard-only و bidi identifier در companionها بررسی شده‌اند. جدول مقایسه در compact کارت/list معادل دارد و drag تنها راه کنترل رسانه نیست.

## قرارداد تجاری و مالکیت

- قیمت، موجودی، وضعیت فروش و Variant از پاسخ authoritative محصول می‌آیند.
- مبلغ فقط عدد صحیح گروه‌بندی‌شده با واحد صریح تومان است؛ Wallet نمایش داده نمی‌شود.
- قیمت عمده فقط برای Session تأییدشده و با برچسب متنی صریح نمایش داده می‌شود.
- تغییر قیمت یا موجودی انتخاب قبلی را بی‌صدا معتبر نگه نمی‌دارد و ادامه نیازمند تأیید داده تازه است.
- Variant ناموجود یا فروش‌متوقف‌شده اقدام ادامه خرید ندارد و دلیل متنی ارائه می‌کند.
- صفحه مقایسه حقیقت قیمت و موجودی را Snapshot مالکانه نمی‌کند و refresh تغییرها را اعلام می‌کند.

- حداکثر چهار محصول و فقط از یک دسته سازگار قابل مقایسه‌اند.
- رسیدن به سقف چهار مورد، انتخاب پنجم را با دلیل و مسیر حذف یک مورد متوقف می‌کند.
- ناسازگاری دسته پیش از افزودن fail-closed است و انتخاب‌های معتبر قبلی حفظ می‌شوند.
- حذف محصول بلافاصله شمارش، focus و جدول/کارت جایگزین را به‌روزرسانی می‌کند.

علاقه‌مندی و هشدار customer-owned هستند و intent مهمان پس از ورود امن حفظ می‌شود. هیچ Wallet، رنگ قهوه‌ای، دارایی بصری اختراعی، Provider claim، API یا Rule تازه وارد نشده است.

## مرز مرحله

55-C هیچ Frontend runtime، Route واقعی، API، Migration، Dependency، Permission، Business Rule، High-fidelity UI یا Prototype ایجاد نمی‌کند. Cart و Checkout در 55-D، Admin در Step 56 و High-fidelity/Prototype در Step 57 باقی می‌مانند.
