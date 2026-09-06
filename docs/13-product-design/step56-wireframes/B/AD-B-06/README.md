# AD-B-06 — الگوی جدول و جزئیات و فرم

Generic reusable table/detail/form grammar only; placeholders are explicitly examples, not Catalog page work. Domain permissions, lifecycle, pagination limits and field rules remain owner-defined in C–G. Compact cards preserve row identity, labels and actions.

## Focus and keyboard

- entry: Main heading; login uses username after heading announcement.
- dialog: Safe cancel/close receives initial focus; Tab stays within modal, Escape cancels; close restores launcher.
- error: Focus error summary with linked field errors; asynchronous status announced without stealing focus.
- navigation: DOM order: skip link, header, navigation, breadcrumb, main heading, content, outcome. RTL does not reverse focus.

## Facet acceptance

- entry-and-context: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- permission-aware-read-or-explicit-unavailable: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- detail-and-history-or-no-read-explanation: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- allowed-action-review-or-read-only: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- authoritative-outcome-and-recovery: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.

## State coverage

| State | View | Required behavior |
|---|---|---|
| approval-required | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| archived | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| audit-reference | table | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| authoritative-success | table | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| blocked-by-lifecycle | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| cancelled | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| destructive-action-confirmation | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| disabled | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| draft | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| empty-filtered | table | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| empty-first-use | table | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| idempotent-replay | table | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| impact-changed | conflict | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| initial-loading | table | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| irreversible-outcome | table | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| manual-review | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| media-pending | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| no-results | table | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| offline | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| partial-success | table | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| permission-denied | table | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| preview-expired | conflict | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| progressive-loading | table | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| provider-unavailable | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| published | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| read-only | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| refresh-loading | table | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| review-required | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| safe-retry | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| sales-stopped | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| scope-filtered | table | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| server-error | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| session-expired | conflict | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| stale-data | conflict | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| status-check | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| step-up-required | table | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| submitting | table | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| terminal-success | table | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| timeout | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| unauthenticated | table | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| unknown-result | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| validation-error | conflict | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| version-conflict | conflict | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
