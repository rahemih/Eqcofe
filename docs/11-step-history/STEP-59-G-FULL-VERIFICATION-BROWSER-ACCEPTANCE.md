# Step 59-G — Full Verification & Browser Acceptance

## هدف

59-G قابلیت جدید اضافه نمی‌کند. این مرحله تمام خروجی Step 59 از Navigation تا Home states را به‌صورت یک سطح واحد قبول یا رد می‌کند.

## Canonical baseline

| Stage | Canonical merge |
| --- | --- |
| 59-A | `8ec202061152b0d941ab0e71100dab87fdde6bc5` |
| 59-B | `d7d235f5f240b8bea44bc607afa812b2f5bb12d4` |
| 59-C | `175fb3f7e110eff98b9574dc9db5984e5e77ae7b` |
| 59-D | `4ef4027c1bf761a9d6abade15eec89f2dbee7e00` |
| 59-E | `814cb7e56d927716f3c101771fa9b56b511181e8` |
| 59-F | `66ccb3834b6e8307485c7b4e090be6bf067c9a04` |

59-F protected merge and exact-SHA postmerge verification passed, including root `pnpm verify` and Phase A.

## Acceptance matrix

59-G verifies the integrated production Home contract:

- responsive Header and keyboard-accessible navigation remain present;
- Search entry remains semantic GET `/search?q=`;
- Home owns one production H1;
- Home server data uses authoritative `GET /products`;
- category discovery links to `/category/:slug`;
- brand discovery hands off to `/search?q=<name>`;
- merchandising preserves authoritative order and renders at most six valid products;
- prices remain explicit Toman;
- product links hand off to `/product/:slug`;
- Buying Guide hands off to `/articles`;
- Wholesale CTA hands off to `/wholesale`;
- Step60 Search/Category, Step61 Product, Step65 Wholesale and Step66 Articles remain placeholders;
- empty/recovery/error/offline state verification from Stage F remains wired;
- no new dependency, backend rule, API, database or downstream feature is introduced.

## Browser acceptance

The existing free/pinned Browser Quality workflow is the browser authority:
- Chromium via pinned Playwright;
- axe-core accessibility;
- keyboard gates;
- responsive widths 320 / 360 / 600 / 840 / 1200 / 1440;
- 400% reflow proxy;
- no horizontal overflow;
- focus and target-size contracts.

59-G does not create a second browser stack.

## Known canonical documentation drift

At Stage-G start, `MASTER-ROADMAP.md` and `CURRENT-STATE.md` still describe Step 59 as NEXT / NOT_STARTED. This is intentionally **not** repaired in 59-G. Stage 59-H owns final canonical state synchronization only after 59-G itself is protected-merged and postmerge green.

## Definition of Done

- final integrated `step59:acceptance` PASS;
- Storefront full `verify` PASS;
- Canonical CI PASS;
- Phase A PASS;
- Browser Quality PASS on exact head;
- deterministic Review + exact-artifact Lock PASS;
- protected merge PASS;
- exact-SHA postmerge `pnpm verify` + Phase A PASS;
- then and only then 59-H may start.

```text
STEP_59_F = CLOSED_CANONICAL_PASS
STEP_59_G = IN_PROGRESS
STEP_59_H = BLOCKED
STEP_60 = NOT_STARTED
ROADMAP_STATE_SYNC = RESERVED_FOR_59_H
```
