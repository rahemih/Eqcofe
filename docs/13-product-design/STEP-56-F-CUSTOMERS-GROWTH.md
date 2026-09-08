# Step 56-F — Customers, Wholesale, Marketing and Content

F design acceptance PASS; canonical completion requires exact-head CI, expected-head merge and post-merge CI. G–H NOT_STARTED. No runtime, API, migration, dependency, permission or business-rule changes.

## Handoff and scope

Starting main `b25c557caf84e7e76da1963c9b719992fda54d60`; E PR158/head `0641e64ec5ea0c166d5b9c8ba83612cdc6ab37b7`, exact-head CI34196787135 and post-merge34196960903 PASS independently verified. Dedicated branch `docs/step56-f-customers-growth` starts from that main. Canonical Roadmap/Current State/Handoff agree E complete, active NONE, F next. A–E machine contracts remain immutable; Step53/54/55 inheritance is retained via A/B.

F covers16 surfaces/100 operations:35 supported authority entries,65 NO_ACTION. Sources112: assembled OpenAPI, auth, immutable A/B/E contracts and all source files in customer, loyalty, catalog, content, marketing, notifications and AI. Every surface retains exact A actors/journeys/domains/permissions/states and operation evidence. No gap is repaired through a UI inference.

Fully blocked: customer history (F01), loyalty balance/adjustment/tiers (F03–04), reviews (F05), promotions/segments (F09–10), AI jobs/research/drafts/knowledge (F13–16). Mixed F07 campaigns supports list/get/create/pause only; F08 coupons list/create only. Blocked reads show no data; blocked mutations have no confirmation/success. Existing controller permissions outside assembled-contract authority are not grants. All four A global gap sets remain unchanged (overlapping156/151/25/5).

## Source-specific acceptance

| Surface | Source behavior and UX boundary |
|---|---|
| F02 wholesale | Submitted starts review; under_review approves/rejects. Approve requires active retail customer and promotes atomically. Comment optional up to2000; reject reason2..2000. No invented creator separation or client If-Match. |
| F06 articles | Current content, aggregate and published versions remain distinct. Edit/restore creates a content version, not publication. Edit/restore blocked archived/approved/scheduled; restore retains published pointer. Submit draft/unpublished, approve in_review, future schedule approved, publish approved/scheduled, unpublish published. Archive reason2..1000; restore reason optional up to1000. Current-version locks do not provide client stale-write prevention. No direct approved-to-draft action invented. |
| F07 campaigns | Create draft, start<end, description up to2000. Pause active only, body expected_version, Step-Up/idempotency; no If-Match header. Activate/resume/reschedule/end/archive remain unavailable even where controller evidence exists. |
| F08 coupons | Existing promotion_id required; no promotion picker because its GET is blocked. Server validates promotion and enclosed time window. Code uppercase normalized3..32; optional positive integer total/per-customer limits. Created enabled=true; review explicitly warns disable is unavailable. No redemption history or automatic rollback. |
| F11 notification delivery | Retry sms/email channels only, statuses blocked/failed/dead_lettered/retry_wait; excludes delivered/processing/in_app. Returns retried ids, not delivery success; no invented retry-limit reset. List status/channel/limit/offset, default50/max100; no fabricated total. Detail returns raw fields, so UI allowlists safe metadata and masks destinations; backend masking is not certified. |
| F12 templates | Create draft, default fa-IR and strict=true. Revise creates new id/version, preserves key/channel/locale/strict; changing variables makes those variables required. Activate draft replaces active sibling; retire non-retired. Preview read-only, no Step-Up/idempotency and no send/internal-enqueue route. Only list supplies selectable template metadata; no independent admin GET invented. |

Article create title<=300, slug<=180 ASCII normalized, optional body<=100000, SEO title<=300/meta<=500 with source unsafe checks. PATCH only five declared fields and at least one; no HTML-sanitization guarantee for body. Display escaped/non-executable content. Article list status/search<=200 and limit<=200 (default50); summary is observation, scheduled success not guaranteed.

Template channel sms/email/in_app; source body1..20000; email subject required<=500; rendered SMS<=1600, other<=50000, scalar variable<=4000. Required variables subset of allowed, sensitive names and executable interpolation prohibited. Preview uses synthetic non-sensitive variables and escaped output; renderer is not an HTML sanitizer. Revision does not silently change the active version. No messages are sent as part of this design gate.

## Common states and review

All inherited state rows have explicit dispositions and view targets. Mixed-surface states are conditional on the selected operation; blocked operation views override every state. Supported writes use safe-cancel confirmation, Step-Up only where traced, and authoritative response; explicit same-key/same-payload replay only after status review. No automatic retry or invented history endpoint. Error summary receives focus and links inline errors, safe draft retained; loading preserves focus and marks retained data stale. Keyboard modal trap/Escape restore,44px touch minimum (frames48px), no fixed action obscuring focus. Persian RTL with LTR-isolated codes and integer Toman/no Wallet/no brown retained. Loyalty is not money. Figma optional; no paid services or invented brand assets.

Primary views exist at320/360/600/840/1200/1440, others320/1440. Existing Step54/B/E shell reused. Four targeted browser screenshots inspect the new long article form, version-sensitive campaign confirmation, notification preview and mixed-surface unavailable action. Other widths and all frame/trace hashes are deterministically checked. Static320 equivalent is not actual400% zoom, keyboard or screen-reader runtime certification. UI/UX Pro Max confirmation/focus guidance retained from prior gate; no new design system replaces canonical tokens.

## Repository evidence

Contract `step56-customers-growth-wireframes.json`; generator and semantic validator `scripts/*step56-customers-growth.mjs`; regression tests `test/design-system/step56-customers-growth.spec.ts`; gallery, manifest, per-surface README/traceability and frames in `step56-wireframes/F/`. Names `AD-F-XX--width--view--v1.svg`. Validator rejects lost authority/coverage, hidden lifecycle guards, unsafe preview/retry/version claims and starting G. Full pnpm verify and git diff --check required. PR/execution report records immutable head, CI jobs, merge and post-merge evidence. Stop after F.

Frozen counts: actors=3, journeys=4, domains=7, permissions=18, surfaces=16, operations=100, blocked=65, supported=35, states=738, views=212, frames=488, artifacts=523, sources=112.
