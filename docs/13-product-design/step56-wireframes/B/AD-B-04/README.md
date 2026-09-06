# AD-B-04 — پوسته و ناوبری و breadcrumb

Inline-start sidebar at expanded widths, disclosure/drawer below 840. Header contains context, local destination search and account/exit. No invented notification feed. Breadcrumb links preserve safe context and focus main heading after navigation.

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
| approval-required | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| approved | shell | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| audit-reference | shell | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| authoritative-success | shell | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| blocked-by-lifecycle | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| cancelled | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| destructive-action-confirmation | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| disabled | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| empty-filtered | shell | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| empty-first-use | shell | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| idempotent-replay | shell | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| impact-changed | denied | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| initial-loading | shell | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| irreversible-outcome | shell | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| manual-review | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| no-results | shell | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| offline | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| partial-success | shell | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| pending-approval | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| permission-denied | denied | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| permission-hidden | denied | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| preview-expired | denied | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| progressive-loading | shell | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| provider-unavailable | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| read-only | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| refresh-loading | shell | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| rejected | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| safe-retry | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| scope-filtered | denied | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| server-error | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| session-expired | denied | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| session-revoked | denied | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| stale-data | denied | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| status-check | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| step-up-required | shell | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| submitting | shell | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| terminal-success | shell | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| timeout | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| unauthenticated | denied | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| unknown-result | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| validation-error | denied | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| version-conflict | denied | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
