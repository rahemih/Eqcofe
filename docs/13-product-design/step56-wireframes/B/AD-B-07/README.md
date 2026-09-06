# AD-B-07 — تأیید خطر و Step-Up و نتیجه و بازیابی

Confirmation, Step-Up and approval are separate gates. Validate exact operation permission conjunction, scope, lifecycle and fresh impact before submission. Unknown result requires owner-supported status check before any safe idempotent retry. No automatic replay or fabricated audit reference.

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
| approval-required | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| approved | outcome | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| audit-reference | outcome | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| authoritative-success | outcome | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| blocked-by-lifecycle | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| cancelled | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| destructive-action-confirmation | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| disabled | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| empty-filtered | confirmation | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| empty-first-use | confirmation | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| idempotent-replay | outcome | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| impact-changed | unknown | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| initial-loading | confirmation | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| irreversible-outcome | outcome | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| manual-review | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| no-results | confirmation | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| offline | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| partial-success | outcome | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| pending-approval | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| permission-denied | confirmation | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| permission-hidden | confirmation | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| preview-expired | unknown | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| progressive-loading | confirmation | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| provider-unavailable | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| read-only | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| refresh-loading | confirmation | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| rejected | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| safe-retry | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| scope-filtered | confirmation | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| server-error | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| session-expired | unknown | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| session-revoked | confirmation | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| stale-data | unknown | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| status-check | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| step-up-required | confirmation | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| submitting | confirmation | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| terminal-success | outcome | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| timeout | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| unauthenticated | confirmation | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| unknown-result | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| validation-error | unknown | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| version-conflict | unknown | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
