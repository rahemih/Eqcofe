# AD-B-01 — ورود و احراز کلید مدیر

Public login returns pre-authentication only, then mandatory FIDO authentication or first-key enrollment with a valid enrollment token. Preserve paste/password manager support. No OTP or password-only bypass. Credential registration/revocation requires existing Step-Up. Logout clears the session; never render tokens.

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
| approval-required | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| approved | login | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| audit-reference | login | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| authoritative-success | login | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| blocked-by-lifecycle | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| cancelled | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| destructive-action-confirmation | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| disabled | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| empty-filtered | login | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| empty-first-use | login | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| idempotent-replay | login | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| impact-changed | auth-error | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| initial-loading | login | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| irreversible-outcome | login | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| manual-review | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| no-results | login | Distinguish no data from filtered empty and denied; offer clear filter only where applicable, never expose hidden counts. |
| offline | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| partial-success | login | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| pending-approval | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| permission-denied | auth-error | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| permission-hidden | auth-error | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| preview-expired | auth-error | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| progressive-loading | login | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| provider-unavailable | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| read-only | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| refresh-loading | login | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| rejected | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| safe-retry | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| scope-filtered | auth-error | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| server-error | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| session-expired | auth-error | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| session-revoked | auth-error | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| stale-data | auth-error | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |
| status-check | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| step-up-required | login | Conditional owner-lifecycle state: expose labeled read-only/disabled context and safe exit; no transition unless exact current owner policy permits it. Shared patterns do not invent an endpoint or lifecycle. |
| submitting | login | Announce busy status; reserve layout; prevent duplicate submissions; keep safe cancel reachable without implying server cancellation. |
| terminal-success | login | Conditional shared pattern only: render outcome only after owner-authoritative response. No source support means unavailable; never optimistic success, fabricated reference or repeated mutation. |
| timeout | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| unauthenticated | auth-error | Fail closed; remove sensitive rows/counts/actions, retain neutral explanation and safe exit. Recheck exact session, permissions and assigned scope before any destination. |
| unknown-result | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| validation-error | auth-error | Announce failure without secrets. Unknown mutation result uses owner-supported status read; no blind retry. Read failure offers explicit safe refresh and preserves safe context. |
| version-conflict | auth-error | Stop submission; re-read current authority and version, preserve only safe draft, request explicit review. Expired session returns to login; never replay. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
