# AD-B-02 — هویت، مجوز و دامنهٔ نشست

Read /admin/me, /permissions and /scopes for the current session. A context selector can narrow assigned scopes only; it cannot edit RBAC. A role/session change clears sensitive data and rechecks each destination.

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
| approval-required | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| approved | identity | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| audit-reference | identity | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| authoritative-success | identity | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| blocked-by-lifecycle | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| cancelled | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| destructive-action-confirmation | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| disabled | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| empty-filtered | identity | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| empty-first-use | identity | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| idempotent-replay | identity | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| impact-changed | revoked | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| initial-loading | identity | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| irreversible-outcome | identity | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| manual-review | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| no-results | identity | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| offline | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| partial-success | identity | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| pending-approval | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| permission-denied | revoked | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| permission-hidden | revoked | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| preview-expired | revoked | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| progressive-loading | identity | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| provider-unavailable | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| read-only | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| refresh-loading | identity | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| rejected | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| safe-retry | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| scope-filtered | revoked | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| server-error | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| session-expired | revoked | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| session-revoked | revoked | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| stale-data | revoked | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| status-check | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| step-up-required | identity | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| submitting | identity | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| terminal-success | identity | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| timeout | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| unauthenticated | revoked | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| unknown-result | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| validation-error | identity | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| version-conflict | revoked | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
