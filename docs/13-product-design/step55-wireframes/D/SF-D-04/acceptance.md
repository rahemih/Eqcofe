# SF-D-04 — معیار پذیرش

**نتیجه:** PASS / 55-D SCREEN GATE

## قاب‌ها

| Viewport | State | Artifact | نتیجه |
|---:|---|---|---|
| 320px | `initial` | `SF-D-04--320--initial--v1.svg` | PASS |
| 1440px | `initial` | `SF-D-04--1440--initial--v1.svg` | PASS |
| 320px | `unavailable` | `SF-D-04--320--unavailable--v1.svg` | PASS |
| 320px | `disabled-with-reason` | `SF-D-04--320--disabled-with-reason--v1.svg` | PASS |

## ساختار

- [x] شناسه، Gate، revision، actor، journey، state، primary و recovery ثبت است.
- [x] shell مشترک، یک H1، progress و اولویت task روشن است.
- [x] سه state در 320px و state نخست در 1440px مستقل‌اند.
- [x] هر شش عرض و 400% reflow ثبت شده‌اند.
- [x] متن بلند فارسی، keyboard و bidi reference مرور شده‌اند.

## تجارت و بازیابی

- [x] quote، stock، shipping، payment و order authoritative هستند.
- [x] تومان صریح است و Wallet وجود ندارد.
- [x] expiry، conflict، timeout و replay موفقیت جعلی نمی‌سازند.
- [x] retry پس از status check و با context/مرجع پایدار است.
- [x] اقدام بازیابی «تغییر نشانی یا دریافت روش‌ها دوباره» bounded است.

## دسترس‌پذیری و مرز

- [x] هدف 44px، focus، announcement، error association و non-color status مشخص‌اند.
- [x] 400% zoom فقط scroll عمودی صفحه دارد.
- [x] API، Runtime، Rule، Migration، Dependency و Permission تغییر نکرده‌اند.
- [x] High-fidelity، Provider success، دارایی برند و Figma dependency ادعا نشده است.

**استثنای باز:** NONE.
