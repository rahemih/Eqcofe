# AD-C-07 — درخواست، بررسی و حذف رسانه

Request a configured signed upload target, transfer and complete separately, inspect processing/quarantine before approval. Delete only unreferenced assets; no media browser endpoint, scan certification or secret URL display.

## Focus and keyboard

- entry: Main heading after authorized navigation.
- dialog: Safe cancel first; Tab stays in modal, Escape closes and restores launcher.
- error: Focus linked error summary after form failure; polite status announcements without focus theft.
- navigation: Inherit B logical RTL order; media move buttons preserve focused item and announce position.

## Facet acceptance

- entry-and-context: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- permission-aware-read-or-explicit-unavailable: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- detail-and-history-or-no-read-explanation: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- allowed-action-review-or-read-only: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- authoritative-outcome-and-recovery: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.

## State coverage

| State | View | Required behavior |
|---|---|---|
| approval-required | upload | Inherited conditional obligation: no generic approval queue, replay guarantee, partial bulk outcome or audit-history endpoint exists here. Use current command response and manual review; unsupported action remains disabled. Media approval is its own source-defined lifecycle. |
| archived | upload | Domain-specific applicability: product lifecycle applies to C01; media lifecycle to C04/C07; sales stop applies only to source-supported targets. Other surfaces retain context/read-only status and do not invent this lifecycle. |
| audit-reference | upload | Inherited conditional obligation: no generic approval queue, replay guarantee, partial bulk outcome or audit-history endpoint exists here. Use current command response and manual review; unsupported action remains disabled. Media approval is its own source-defined lifecycle. |
| authoritative-success | upload | Show the source-supported current state and permitted next action; no state name alone grants authority. |
| blocked-by-lifecycle | upload | Show the source-supported current state and permitted next action; no state name alone grants authority. |
| cancelled | upload | Show the source-supported current state and permitted next action; no state name alone grants authority. |
| destructive-action-confirmation | reject | Show target, scope, impact and reversibility; safe cancel is initial focus. Step-Up is server-required for sales-control apply only in this C source; confirmation does not invent permission or approval. |
| disabled | upload | Show the source-supported current state and permitted next action; no state name alone grants authority. |
| draft | upload | Domain-specific applicability: product lifecycle applies to C01; media lifecycle to C04/C07; sales stop applies only to source-supported targets. Other surfaces retain context/read-only status and do not invent this lifecycle. |
| empty-filtered | upload | Distinguish empty data, local-filter empty and denied. Clear only local filters; do not invent server search or leak hidden counts. |
| empty-first-use | upload | Distinguish empty data, local-filter empty and denied. Clear only local filters; do not invent server search or leak hidden counts. |
| idempotent-replay | upload | Inherited conditional obligation: no generic approval queue, replay guarantee, partial bulk outcome or audit-history endpoint exists here. Use current command response and manual review; unsupported action remains disabled. Media approval is its own source-defined lifecycle. |
| impact-changed | upload | Stop submission, reload authorized current record/version or obtain a new sales preview; preserve safe draft for explicit comparison. No silent overwrite and no claim of fresh server recount where absent. |
| initial-loading | upload | Reserve layout and announce busy status; disable duplicate submit; safe navigation does not imply server cancellation. |
| irreversible-outcome | upload | Inherited conditional obligation: no generic approval queue, replay guarantee, partial bulk outcome or audit-history endpoint exists here. Use current command response and manual review; unsupported action remains disabled. Media approval is its own source-defined lifecycle. |
| manual-review | upload | Show the source-supported current state and permitted next action; no state name alone grants authority. |
| media-pending | upload | Domain-specific applicability: product lifecycle applies to C01; media lifecycle to C04/C07; sales stop applies only to source-supported targets. Other surfaces retain context/read-only status and do not invent this lifecycle. |
| no-results | upload | Distinguish empty data, local-filter empty and denied. Clear only local filters; do not invent server search or leak hidden counts. |
| offline | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| partial-success | upload | Inherited conditional obligation: no generic approval queue, replay guarantee, partial bulk outcome or audit-history endpoint exists here. Use current command response and manual review; unsupported action remains disabled. Media approval is its own source-defined lifecycle. |
| permission-denied | upload | Fail closed; hide sensitive object/counts and actions, retain neutral safe exit. Reauthenticate and recheck exact per-operation permission before reload; never replay pending command. |
| preview-expired | upload | Stop submission, reload authorized current record/version or obtain a new sales preview; preserve safe draft for explicit comparison. No silent overwrite and no claim of fresh server recount where absent. |
| progressive-loading | upload | Reserve layout and announce busy status; disable duplicate submit; safe navigation does not imply server cancellation. |
| provider-unavailable | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| published | upload | Domain-specific applicability: product lifecycle applies to C01; media lifecycle to C04/C07; sales stop applies only to source-supported targets. Other surfaces retain context/read-only status and do not invent this lifecycle. |
| read-only | upload | Show the source-supported current state and permitted next action; no state name alone grants authority. |
| refresh-loading | upload | Reserve layout and announce busy status; disable duplicate submit; safe navigation does not imply server cancellation. |
| review-required | upload | Inherited conditional obligation: no generic approval queue, replay guarantee, partial bulk outcome or audit-history endpoint exists here. Use current command response and manual review; unsupported action remains disabled. Media approval is its own source-defined lifecycle. |
| safe-retry | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| sales-stopped | upload | Domain-specific applicability: product lifecycle applies to C01; media lifecycle to C04/C07; sales stop applies only to source-supported targets. Other surfaces retain context/read-only status and do not invent this lifecycle. |
| scope-filtered | upload | Fail closed; hide sensitive object/counts and actions, retain neutral safe exit. Reauthenticate and recheck exact per-operation permission before reload; never replay pending command. |
| server-error | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| session-expired | upload | Stop submission, reload authorized current record/version or obtain a new sales preview; preserve safe draft for explicit comparison. No silent overwrite and no claim of fresh server recount where absent. |
| stale-data | upload | Stop submission, reload authorized current record/version or obtain a new sales preview; preserve safe draft for explicit comparison. No silent overwrite and no claim of fresh server recount where absent. |
| status-check | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| step-up-required | reject | Show target, scope, impact and reversibility; safe cancel is initial focus. Step-Up is server-required for sales-control apply only in this C source; confirmation does not invent permission or approval. |
| submitting | upload | Reserve layout and announce busy status; disable duplicate submit; safe navigation does not imply server cancellation. |
| terminal-success | upload | Inherited conditional obligation: no generic approval queue, replay guarantee, partial bulk outcome or audit-history endpoint exists here. Use current command response and manual review; unsupported action remains disabled. Media approval is its own source-defined lifecycle. |
| timeout | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| unauthenticated | upload | Fail closed; hide sensitive object/counts and actions, retain neutral safe exit. Reauthenticate and recheck exact per-operation permission before reload; never replay pending command. |
| unknown-result | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| validation-error | unavailable | Read failure permits explicit refresh; unknown mutation outcome prohibits automatic retry. Use existing owner read to reconcile; no status read means manual follow-up. Preserve safe draft and show field errors without secrets. |
| version-conflict | upload | Stop submission, reload authorized current record/version or obtain a new sales preview; preserve safe draft for explicit comparison. No silent overwrite and no claim of fresh server recount where absent. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
