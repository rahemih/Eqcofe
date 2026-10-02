# Step 62-G — UX States, Accessibility, RTL & Responsive Hardening

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `4d8afb3733fc2091acc16177098c7edfc6e1143c`
- Step 62-A through 62-F: `CANONICAL_COMPLETE`
- Step 62-F terminal Lock release comment: `5951586026`
- Stage 62-G: `IN_PROGRESS`
- Linear tracker: `HOS-66`

## Fresh Live Guard

Immediately before Stage 62-G:

- `main = 4d8afb3733fc2091acc16177098c7edfc6e1143c`
- open Step-62 PRs = `0`
- competing Step-62 writer = `NONE OBSERVED`
- predecessor PR #297 = `MERGED / CLOSED`
- predecessor protected workflow_dispatch `37001790050` / Run #809 = `SUCCESS`
- predecessor merge job `110820924950` = `SUCCESS`
- predecessor exact-SHA postmerge job `110821020425` = `SUCCESS`
- predecessor Lock `LOCK-EQCOFE-STEP62-F-PRODUCT-LISTING-INTEGRATION-001-01` = `RELEASED`

## Scope

Stage 62-G hardens already-canonical Compare/Wishlist behavior without changing its business authority:

- keyboard-scrollable Compare table region with explicit instructions;
- clearer per-product link purpose for repeated Compare links;
- Compare recovery actions that preserve the current deterministic URL when retrying;
- explicit reset action for invalid Compare URLs;
- live Compare selection count;
- removable Compare summary chips while preserving Product Detail seed ownership;
- focusable `aria-disabled` Compare controls with described blocking reason instead of inaccessible native disabled controls;
- Wishlist `aria-busy`, hint/feedback `aria-describedby`, live feedback and submitting lock semantics;
- design-token based focus/status styling;
- logical RTL positioning and no physical left/right CSS;
- 320px responsive selection hardening and scroll containment;
- sticky logical first Compare column within the scroll region.

## Authority boundary

This Stage does **not**:

- change backend Compare compatibility rules;
- change Wishlist ownership, auth or mutation authority;
- create browser auth/token/local-storage state;
- change backend/OpenAPI/database/auth platform/dependencies/lockfiles;
- create Account Wishlist management or Product Alerts;
- claim full integrated browser acceptance — owned by 62-H;
- update Roadmap/Current State before 62-I.

## Accessibility/UX intent

- Repeated links identify the product in their accessible name.
- Horizontally scrollable comparison content is focusable and labelled.
- Blocked Compare controls remain keyboard-focusable and expose the reason with `aria-describedby`.
- Selection changes announce the current count through a polite atomic live region.
- Selected items can be removed from the summary without searching for their ProductCard again.
- Wishlist async mutations expose busy state and connect the control to current hint/feedback text.
- Retry preserves the same Compare URL for offline/recovery states.
- Invalid query recovery explicitly clears the bad URL instead of silently mutating state.

## Definition of Done

- predecessor closure and exact canonical base captured;
- no competing Step-62 writer;
- dedicated 62-G verifier is part of Storefront `verify`;
- keyboard/focus/live-region semantics are explicit;
- 44px target/focus design tokens are used for changed controls;
- Compare horizontal scroll is contained and keyboard reachable;
- changed CSS uses logical RTL properties and contains no brown token/name;
- 320px hardening is present without replacing existing 360/600/840/1200 breakpoints;
- no client auth or business-authority invention;
- exact-head Canonical CI / Phase A / Storefront Quality / deterministic review pass;
- exact-artifact ACTIVE Lock recorded;
- protected merge and exact-SHA postmerge verification pass;
- terminal Lock becomes `RELEASED`;
- only then may 62-H begin.

## Current boundary

```text
STEP_62_A_TO_F = CANONICAL_COMPLETE
STEP_62_G = IN_PROGRESS
STEP_62_H = BLOCKED_UNTIL_62_G_CANONICAL_COMPLETE
STEP_62_I = NOT_STARTED
CLAIMED_CANONICAL_PASS = NO
```
