# Step 54 — Accessibility Foundation

**Status:** COMPLETE / A10 GATE PASS

## هدف

هدف Design System، WCAG 2.2 Level AA است. این سند ادعای Conformance محصول نیست؛ Conformance فقط روی Screen و Implementation واقعی در Steps بعدی سنجیده می‌شود. Target داخلی 44×44px برای Touch از حداقل 24×24px AA سخت‌گیرانه‌تر است.

منابع معیار: [WCAG 2.2](https://www.w3.org/TR/WCAG22/)، [Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)، [Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) و [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Acceptance matrix

| حوزه | معیار Step 54 | Evidence در مراحل بعد |
|---|---|---|
| Text contrast | 4.5:1 عادی؛ 3:1 بزرگ | automated + visual contrast check |
| Non-text/UI | 3:1 برای مرز و State تعاملی | component/state audit |
| Focus | Ring 3px، تغییر کنتراست 3:1، پوشیده‌نشدن | keyboard walkthrough |
| Keyboard | همه Actionها؛ بدون Trap ناخواسته | end-to-end keyboard test |
| Target | حداقل 44×44px داخلی | computed layout measurement |
| Reflow | بدون loss تا 400% | viewport/zoom test |
| Text spacing | بدون Clip/Overlap | override stylesheet test |
| RTL reading | DOM/Focus منطقی، Bidi isolate | screen-reader + keyboard audit |
| Forms | Label/Help/Error/Summary association | accessibility tree + form test |
| Status | متن/نام/Icon؛ نه Color-only | grayscale/state audit |
| Async | live announcement متناسب با urgency | assistive-technology test |
| Motion | reduced-motion و بدون وابستگی معنایی | media-query test |
| Drag | single-pointer alternative | interaction test |
| Authentication | alternative غیرشناختی | journey validation |

## Focus و Overlay

Focus ring به‌طور پیش‌فرض 3px Blue است و Component نباید آن را Clip کند. Dialog/Drawer Focus را داخل Context نگه می‌دارد، Title و Description programmatic دارد، Escape policy مشخص است و پس از Close Focus را به Trigger معتبر برمی‌گرداند. Sticky header/footer یا Toast نباید عنصر focused را کامل بپوشاند.

## Forms و Error

Error summary در ابتدای Form به Fieldهای نامعتبر Link می‌دهد؛ هر Field `aria-describedby` معادل Help/Error و State معتبر دارد. پیام async معمولی `status` و شکست urgent در صورت لزوم `alert` است. Validation فقط با Border قرمز منتقل نمی‌شود.

## Reduced motion

در `prefers-reduced-motion: reduce` duration غیرضروری صفر می‌شود، Auto-scroll و Parallax حذف می‌شوند و Progress/State با متن باقی می‌ماند. Animation هیچ اطلاعات یکتایی حمل نمی‌کند.

## Gate rule

هیچ Wireframe یا UI بعدی بدون Mapping به این Matrix قابل PASS نیست. هر استثنا باید دلیل essential، دامنه، جایگزین و Evidence داشته باشد و در همان Step ثبت شود.

