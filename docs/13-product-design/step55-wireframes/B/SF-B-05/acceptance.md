# SF-B-05 — معیار پذیرش

**نتیجه:** PASS / 55-B SCREEN GATE

## Evidence قاب‌ها

| Viewport | State | Artifact | نتیجه |
|---:|---|---|---|
| 320px | `enabled` | `SF-B-05--320--enabled--v1.svg` | PASS |
| 1440px | `enabled` | `SF-B-05--1440--enabled--v1.svg` | PASS |
| 320px | `disabled-with-reason` | `SF-B-05--320--disabled-with-reason--v1.svg` | PASS |
| 320px | `filtered` | `SF-B-05--320--filtered--v1.svg` | PASS |

## چک ساختاری

- [x] شناسه، Gate، revision، viewport، actor، journey، state، source، اقدام اصلی و بازیابی روی قاب ثبت است.
- [x] shell مشترک، یک H1، مسیر اصلی و اولویت محتوا روشن است.
- [x] سه state تثبیت‌شده 320px و state اصلی 1440px artifact مستقل دارند.
- [x] تصمیم‌های 360/600/840/1200/1440 در README و traceability ثبت شده‌اند.
- [x] 400% reflow، متن بلند فارسی، keyboard-only و bidi identifier مرور قراردادی شده‌اند.

## چک وضعیت و بازیابی

- [x] Loading/refresh زمینه امن را حفظ می‌کند و تغییر نتیجه announce می‌شود.
- [x] Empty، filtered و no-result در صورت ارتباط یکسان فرض نشده‌اند.
- [x] خطا/timeout/offline موفقیت کاذب ندارد و retry bounded است.
- [x] Disabled reason کنار کنترل نوشته می‌شود؛ authorization از ظاهر استنباط نمی‌شود.
- [x] اقدام بازیابی «پاک‌کردن انتخاب ناسازگار» ورودی امن یا پرس‌وجو را حفظ می‌کند.

## چک تجارت، RTL و دسترس‌پذیری

- [x] قیمت نمونه عدد صحیح گروه‌بندی‌شده با واحد «تومان» است و Wallet وجود ندارد.
- [x] قیمت/موجودی authoritative و تغییر آن قابل مشاهده است.
- [x] ترتیب DOM/focus معنی‌دار RTL است و با mirror بصری وارونه نشده است.
- [x] هدف‌های تعاملی حداقل 44px، focus مرئی و status غیررنگی‌اند.
- [x] Placeholder رسانه و محل نشان برچسب‌دارند؛ دارایی بصری اختراع نشده است.

## چک مرز

- [x] API، Runtime، Migration، Dependency، Permission و Business Rule تغییر نکرده است.
- [x] این artifact کم‌جزئیات است؛ High-fidelity و Prototype را ادعا نمی‌کند.
- [x] Repository مرجع Canonical است؛ Figma رایگان اختیاری و غیرمسدودکننده است.

**استثنای باز:** NONE.
