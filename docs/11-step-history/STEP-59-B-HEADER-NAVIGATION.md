# Step 59-B — Header, Responsive Navigation & Search Entry

**Stage 59-B productionizes only the Storefront shell entry surface. Home content/data and every Step-60 search/listing capability remain out of scope.**

## خلاصه ساده

در این مرحله نوار بالای فروشگاه و مسیر شروع جست‌وجو از حالت زیرساختی به رفتار واقعی و قابل استفاده تبدیل می‌شوند. کاربر می‌تواند عبارت خود را در Header وارد کند و با GET به مسیر `/search?q=...` برود؛ اما نمایش نتیجه، پیشنهاد جست‌وجو، فیلتر و listing هنوز عمداً برای Step 60 باقی می‌مانند.

## Canonical baseline

- Stage 59-A merge/main: `8ec202061152b0d941ab0e71100dab87fdde6bc5`
- Stage 59-A: `CLOSED / CANONICAL PASS`
- Stage 59-B baseline open PRs: `0`
- Stage 59-B runtime starting point:
  - Header search = simple Link
  - compact navigation disclosure = implemented foundation
  - Home = Step-59 placeholder
  - Search = Step-60 placeholder
  - Category = Step-60 placeholder

## Implemented Stage-B scope

- semantic Header search form with `method=get`, `action=/search`, and query parameter `q`;
- visible Persian search label and explicit submit action;
- no hidden business logic and no browser-side search authority;
- quick-action source order aligned to frozen keyboard contract: Account before Cart;
- utility information strip with no extra focus target;
- compact navigation Escape-close behavior with focus returned to the menu toggle;
- existing route-close behavior preserved;
- responsive CSS for search/header/navigation using logical properties only;
- dedicated Stage-59-B static + SSR verification wired into the Storefront `verify` chain.

## Explicit non-scope

- Home data loader/content/merchandising;
- search suggestions API call;
- search result rendering;
- category/brand discovery data;
- filters/sort/pagination/infinite listing;
- product cards or product-detail behavior;
- compare/wishlist implementation;
- cart/checkout implementation;
- backend/API/database/permission/business-rule changes;
- new dependency or lockfile change.

## Accessibility and responsive contracts

- `fa-IR` / RTL remains authoritative.
- Source-order focus remains logical in RTL.
- Header controls remain at least 44×44 CSS px.
- Search has a programmatic and visible Persian label.
- Compact navigation retains `aria-expanded` and `aria-controls`.
- Escape closes the compact navigation and restores focus to its trigger.
- No positive tabindex, autofocus, non-semantic click target, physical left/right CSS or `row-reverse`.
- Canonical width contract remains `320, 360, 600, 840, 1200, 1440`, with 400% reflow preserved by inherited quality gates.
- Brown remains prohibited.

## Definition of Done

- exact Stage-B scope only;
- Task Contract and generated Task Catalog exact;
- dedicated navigation verification passes;
- Storefront `verify` passes;
- root `pnpm verify` passes;
- exact-head Canonical CI and Phase A pass;
- deterministic review and exact-artifact lock pass;
- protected Merge Policy transport passes;
- exact-SHA postmerge `pnpm verify` and Phase A pass;
- only then may 59-C begin.

```text
STEP_59_A = CLOSED_CANONICAL_PASS
STEP_59_B = IN_PROGRESS
STEP_59_C = BLOCKED
STEP_60_SEARCH_RESULTS = NOT_STARTED
```
