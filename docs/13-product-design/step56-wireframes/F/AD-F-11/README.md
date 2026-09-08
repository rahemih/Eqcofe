# AD-F-11 — تحویل اعلان و تلاش مجدد

Manual retry only sms/email delivery statuses blocked/failed/dead_lettered/retry_wait; delivered/processing/in_app excluded. Returns retried ids, not delivered. Raw detail projection is not certified masked; show only safe allowlisted metadata.

## Focus and keyboard

- entry: Focus heading; logical RTL order and LTR-isolated identifiers and references; no data disclosure outside permission.
- dialog: Initial focus safe cancel; Tab trapped in modal, Escape restores trigger. Step-Up inherits secure B behavior and returns to review.
- error: After failed submit focus linked error summary and inline description; retain safe input; asynchronous refresh never steals focus.
- navigation: Keyboard alternatives for every action, labelled compact cards and44px minimum touch targets; no fixed action obscures focus. Polite result announcement.

## Facet acceptance

- entry-and-context: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- permission-aware-read-or-explicit-unavailable: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- detail-and-history-or-no-read-explanation: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- allowed-action-review-or-read-only: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.
- authoritative-outcome-and-recovery: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.

## State coverage

| State | View | Required behavior |
|---|---|---|
| active | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| applied | success | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| approval-required | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| approved | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| audit-reference | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| authoritative-success | success | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| blocked-by-lifecycle | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| cancelled | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| change-requested | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| dead-letter | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| delivery-failed | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| destructive-action-confirmation | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| disabled | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| empty-filtered | empty | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| empty-first-use | empty | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| idempotent-replay | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| impact-changed | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| initial-loading | loading | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| irreversible-outcome | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| maintenance | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| manual-review | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| no-results | empty | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| offline | conflict | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| partial-success | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| permission-denied | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| preview-expired | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| progressive-loading | loading | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| provider-unavailable | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| read-only | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| refresh-loading | loading | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| retry-step-up | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| safe-retry | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| scope-filtered | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| server-error | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| session-expired | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| stale-data | conflict | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| standby | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| status-check | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| step-up-required | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| submitting | loading | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| terminal-success | success | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| timeout | conflict | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| unauthenticated | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| unhealthy | overview | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| unknown-result | conflict | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| validation-error | denied | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |
| version-conflict | conflict | Conditional on traced operation: blocked operations always use their unavailable view. Preserve safe input, focus errors, label stale data, never automatically retry; only server outcome is authoritative. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
