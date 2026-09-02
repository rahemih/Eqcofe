# SF-E-07 — معیار پذیرش

**نتیجه:** PASS / 55-E SCREEN GATE

## قاب‌ها

| Viewport | State | Artifact | نتیجه |
|---:|---|---|---|
| 320px | `enabled` | `SF-E-07--320--enabled--v1.svg` | PASS |
| 1440px | `enabled` | `SF-E-07--1440--enabled--v1.svg` | PASS |
| 320px | `unauthenticated` | `SF-E-07--320--unauthenticated--v1.svg` | PASS |
| 320px | `disabled-with-reason` | `SF-E-07--320--disabled-with-reason--v1.svg` | PASS |

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
- [x] بازیابی «ورود به حساب یا مشاهده وضعیت موجود» bounded و بدون رکورد تکراری است.

## دسترس‌پذیری و مرز

- [x] هدف 44px، focus، announcement، error association و non-color status مشخص‌اند.
- [x] zoom 400% فقط scroll عمودی صفحه دارد.
- [x] API، Runtime، Rule، Migration، Dependency و Permission تغییر نکرده‌اند.
- [x] High-fidelity، فایل واقعی، دارایی برند و Figma dependency ادعا نشده است.

**استثنای باز:** NONE.
