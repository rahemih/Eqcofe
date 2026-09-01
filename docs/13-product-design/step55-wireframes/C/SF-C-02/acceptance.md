# SF-C-02 — معیار پذیرش

**نتیجه:** PASS / 55-C SCREEN GATE

## Evidence قاب‌ها

| Viewport | State | Artifact | نتیجه |
|---:|---|---|---|
| 320px | `progressive` | `SF-C-02--320--progressive--v1.svg` | PASS |
| 1440px | `progressive` | `SF-C-02--1440--progressive--v1.svg` | PASS |
| 320px | `unavailable` | `SF-C-02--320--unavailable--v1.svg` | PASS |
| 320px | `no-result` | `SF-C-02--320--no-result--v1.svg` | PASS |

## چک ساختاری

- [x] شناسه، Gate، revision، viewport، actor، journey، state، source، اقدام اصلی و بازیابی ثبت است.
- [x] shell مشترک، یک H1 و اولویت ارزیابی روشن است.
- [x] سه state در 320px و state اصلی در 1440px artifact مستقل دارند.
- [x] تصمیم‌های 360/600/840/1200/1440 و 400% reflow ثبت شده‌اند.
- [x] متن بلند فارسی، keyboard-only و bidi identifier مرور قراردادی شده‌اند.

## چک وضعیت و بازیابی

- [x] قیمت، موجودی و Variant authoritative هستند و stale state اعلام می‌شود.
- [x] رسانه ناموجود تصمیم را به placeholder جعلی وابسته نمی‌کند.
- [x] مقایسه حداکثر چهار محصول هم‌دسته است و ناسازگاری fail-closed دارد.
- [x] ورود یا mutation intent امن را حفظ می‌کند و موفقیت کاذب ندارد.
- [x] اقدام بازیابی «بازگشت به اطلاعات متنی محصول» bounded و قابل فهم است.

## چک RTL و دسترس‌پذیری

- [x] قیمت عدد صحیح با واحد «تومان» است و Wallet وجود ندارد.
- [x] ترتیب DOM/focus معنی‌دار RTL است و وضعیت فقط با رنگ منتقل نمی‌شود.
- [x] هدف‌ها حداقل 44px، focus مرئی و announcement لازم مشخص است.
- [x] DataTable کارت/list معادل compact و رسانه کنترل غیرکشیدنی دارد.
- [x] Placeholder رسانه و محل نشان برچسب‌دارند؛ دارایی اختراع نشده است.

## چک مرز

- [x] API، Runtime، Migration، Dependency، Permission و Business Rule تغییر نکرده است.
- [x] artifact کم‌جزئیات است؛ High-fidelity و Prototype را ادعا نمی‌کند.
- [x] Repository مرجع Canonical و Figma اختیاری است.

**استثنای باز:** NONE.
