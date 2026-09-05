# SF-E-01 — معیار پذیرش

**نتیجه:** PASS / 55-E SCREEN GATE

## قاب‌ها

| Viewport | State | Artifact | نتیجه |
|---:|---|---|---|
| 320px | `initial` | `SF-E-01--320--initial--v1.svg` | PASS |
| 1440px | `initial` | `SF-E-01--1440--initial--v1.svg` | PASS |
| 320px | `unauthenticated` | `SF-E-01--320--unauthenticated--v1.svg` | PASS |
| 320px | `partial` | `SF-E-01--320--partial--v1.svg` | PASS |

## ساختار

- [x] شناسه، Gate، revision، actor، journey، state، primary و recovery ثبت است.
- [x] shell مشترک، یک H1 و اولویت کار روشن است.
- [x] سه state در 320px و state نخست در 1440px مستقل‌اند.
- [x] هر شش عرض و zoom 400% ثبت شده‌اند.
- [x] متن فارسی، keyboard، status و bidi reference مرور شده‌اند.

## مالکیت و بازیابی

- [x] منبع customer-owned و Session-bound است.
- [x] empty، partial، denied، pending و terminal با یکدیگر اشتباه نمی‌شوند.
- [x] approval، eligibility، price، order و timeline authoritative می‌مانند.
- [x] تومان صریح است و Wallet وجود ندارد.
- [x] بازیابی «تلاش دوباره فقط برای بخش ناموفق» bounded و بدون رکورد تکراری است.

## دسترس‌پذیری و مرز

- [x] هدف 44px، focus، announcement، error association و non-color status مشخص‌اند.
- [x] zoom 400% فقط scroll عمودی صفحه دارد.
- [x] API، Runtime، Rule، Migration، Dependency و Permission تغییر نکرده‌اند.
- [x] High-fidelity، فایل واقعی، دارایی برند و Figma dependency ادعا نشده است.

**استثنای باز:** NONE.
