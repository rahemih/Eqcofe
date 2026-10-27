# AD-E-09 — فروشگاه، صندوق و شیفت حضوری

No source-backed API operation exists for POS store, register, shift or generic order concepts after Step70-B reconciliation. This surface remains concept-only and must not expose data, mutation controls, loading success or inferred lifecycle authority.

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
| allocation-needed | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| approval-required | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| audit-reference | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| authoritative-success | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| blocked | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| blocked-by-lifecycle | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| cancelled | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| completed | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| confirmed | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| destructive-action-confirmation | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| disabled | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| empty-filtered | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| empty-first-use | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| handed-over | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| idempotent-replay | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| impact-changed | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| initial-loading | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| irreversible-outcome | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| manual-review | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| new | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| no-results | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| offline | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| partial-success | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| payment-pending | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| permission-denied | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| picking | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| preview-expired | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| progressive-loading | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| provider-unavailable | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| read-only | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| ready | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| refresh-loading | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| safe-retry | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| scope-filtered | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| server-error | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| session-expired | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| stale-data | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| status-check | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| step-up-required | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| submitting | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| terminal-success | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| timeout | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| unauthenticated | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| unknown-result | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| validation-error | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |
| version-conflict | denied | NO_ACTION: این سطح پس از reconciliation فاقد endpoint و controller منبع‌اثبات‌شده است؛ هیچ داده، mutation، loading-success یا چرخهٔ شیفت از قراردادهای دیگر استنباط نمی‌شود و بازگشت امن تنها اقدام مجاز است. |

## Responsive acceptance

Primary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.
