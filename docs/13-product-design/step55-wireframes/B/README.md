# Step 55-B — وایرفریم کشف و ورودی خرید

**وضعیت:** COMPLETE / GATE PASS — Step 55 ادامه دارد و 55-C هنوز شروع نشده است.

این پوشه خروجی Canonical و کم‌جزئیات 55-B است. قرارداد ماشین‌خوان `docs/13-product-design/step55-discovery-wireframes.json` منبع تولید قطعی است؛ فایل‌های SVG، ردیابی و پذیرش با اسکریپت تولید می‌شوند و ویرایش دستی آن‌ها مجاز نیست. Figma فقط Mirror اختیاری رایگان است و نبود یا ناقص‌بودن آن این Gate را مسدود نمی‌کند.

## محدوده تثبیت‌شده

| شناسه | صفحه/ناحیه | Route intent | حالت‌های الزامی | اقدام اصلی |
|---|---|---|---|---|
| SF-B-01 | خانه و ورودی خرید | `/` | initial، progressive، no-result | جست‌وجوی محصول |
| SF-B-02 | دسته ابزار دم‌آوری | `/category/:slug` | initial، filtered، no-result | مشاهده محصولات دسته |
| SF-B-03 | نتایج جست‌وجوی «آسیاب دستی» | `/search?q=` | initial، no-result، offline | جست‌وجوی دوباره |
| SF-B-04 | فهرست محصولات | `listing-region` | progressive، out-of-stock، price-changed | بازکردن محصول |
| SF-B-05 | فیلتر و مرتب‌سازی محصولات | `listing-query-state` | enabled، disabled-with-reason، filtered | اعمال ۳ فیلتر |
| SF-B-06 | بازیابی مسیر کشف محصول | `listing-state` | no-result، timeout، failed | تلاش دوباره |

مسیر اصلی از خانه به دسته یا جست‌وجو، سپس فهرست/فیلتر و در نهایت handoff به Product Detail در 55-C است. مسیر dashed بازیابی، عبارت، دسته و فیلتر امن را نگه می‌دارد؛ هیچ خطا موفقیت تلقی نمی‌شود.

## ماتریس responsive

| عرض | Grid | Shell | Listing | Filter |
|---:|---|---|---|---|
| 320px | 4 columns / 16 margin / 16 gutter | دو ردیف؛ منو disclosure؛ جست‌وجو تمام‌عرض | یک ستون | drawer تمام‌قد |
| 360px | 4 columns / 16 margin / 16 gutter | دو ردیف؛ اقدام‌های حساب و سبد در دسترس | یک ستون | drawer تمام‌قد |
| 600px | 8 columns / 24 margin / 24 gutter | جست‌وجو در ردیف مستقل در صورت نیاز | دو ستون | drawer با خلاصه انتخاب‌ها |
| 840px | 12 columns / 32 margin / 24 gutter | ناوبری و جست‌وجو هم‌زمان نمایان | سه ستون؛ فیلتر کنار محتوا | aside سه‌ستونه |
| 1200px | 12 columns / 32 margin / 24 gutter | جست‌وجوی غالب و مقصدهای اصلی نمایان | چهار ستون؛ فیلتر کنار محتوا | aside سه‌ستونه |
| 1440px | 12 columns / 32 margin / 24 gutter; content max 1280 | محتوا در مرکز با عرض حداکثر 1280 | چهار ستون؛ فضای بیشتر فقط در gutter | aside سه‌ستونه |

هر صفحه سه حالت compact در 320px و یک قاب expanded در 1440px دارد. عرض‌های 360، 600، 840 و 1200 با قواعد صریح companionها بررسی شده‌اند. بررسی 400% zoom، متن بلند فارسی، keyboard-only و bidi identifier نیز در acceptance هر صفحه ثبت است. این evidence به معنی ادعای WCAG conformance نیست.

## قرارداد محتوایی و تجاری

- قیمت و موجودی در کارت‌ها server-authoritative هستند.
- مبلغ فقط عدد صحیح گروه‌بندی‌شده با واحد صریح تومان است.
- قیمت عمده فقط برای Session تأییدشده و با برچسب متنی نمایش داده می‌شود.
- تغییر قیمت یا موجودی هنگام refresh پنهان نمی‌شود و اقدام امن پیشنهاد می‌شود.
- هیچ Wallet یا موجودی نقدی در discovery نمایش داده نمی‌شود.

کارت محصول فقط عنوان، رسانه خنثی، قیمت/موجودی authoritative و مسیر ارزیابی را نشان می‌دهد. جزئیات Variant، compare، wishlist و خرید در 55-C به بعد هستند. مبلغ نمونه عدد صحیح فارسی با واحد صریح «تومان» است. رنگ قهوه‌ای، تم تیره، تصویر/لوگوی اختراعی، Provider claim و Rule جدید وارد نشده‌اند.

## مرز مرحله

55-B هیچ Frontend runtime، Route واقعی، API، Migration، Dependency، Permission، Business Rule، High-fidelity UI یا Prototype ایجاد نمی‌کند. Admin در Step 56، High-fidelity/Prototype در Step 57 و Storefront implementation از Step 58 آغاز می‌شوند.
