# Step 56-B — Admin Information Architecture and Shell

Repository-native low-fidelity design gate. The source is `step56-admin-shell-wireframes.json`; generated evidence is in `step56-wireframes/B/`. Seven B obligations, 23 view variants, 74 SVG frames and 91 deterministic artifacts. No C–H domain wireframes or runtime implementation.

## Authority and navigation

The A contract is an immutable foundation snapshot at its closure. B inherits its 97-surface/532-operation dependency union, all four discrepancy sets and exact operation authority. The B contract records subsequent progression; A's historical next-gate field remains unchanged. The current Roadmap and B history determine the current position.

The eight inherited groups remain: overview; commerce/orders; merchandise/pricing; inventory/supply; customers; finance/reports; configuration/governance; security/operations. The destination registry retains every foundation surface ID, its operation dependencies and group. IDs are design destinations, not invented frontend URLs. Shared shell destinations and cross-domain references do not create new ownership or implement C–G pages.

Destination visibility is derived from current authenticated server policy and assigned scope. Discovery may expose a permitted read destination; actions separately require the conjunction of that operation's permissions, server-assigned scope and owner lifecycle. A surface permission union is never an authorization shortcut. Missing/conflicting/unassembled evidence remains NO_ACTION. A role or scope change invalidates cached destinations and sensitive rows before refresh. A denied deep link reveals no entity existence or count.

Local search filters authorized destination titles only. It does not query customer/order data or invent global-search APIs. Quick actions navigate to a review destination; they do not execute commands. Notification administration can remain a destination; no personal unread badge, feed or notification API is implied. Return links preserve safe filters/page/context only after authorization is checked again.

## Per-surface design acceptance

| Surface | Entry / task | Read / detail | Action / outcome and recovery |
|---|---|---|---|
| AD-B-01 | Public login; no sidebar before authentication | Username/password produce pre-auth only; FIDO challenge then verify; first key requires issued enrollment token | Password managers/paste allowed; no OTP/password-only bypass. Credential list/add/revoke requires authenticated session and existing Step-Up. Cancellation/expiry returns safely; no token display |
| AD-B-02 | Account/context control after session | Read me, permissions and scopes; warehouse/physical_store are server assigned | Context narrows assignment, never edits RBAC. Revoked session clears sensitive content and requires login; pending actions never replay |
| AD-B-03 | Authorized overview destination | Dashboard endpoint lacks reconciled runtime/permission evidence | Unavailable panel only, no fabricated metrics/counts/health or success. Static authorized destination links remain available |
| AD-B-04 | Header/menu/deep link | Eight group disclosures, breadcrumb and current destination | Expanded sidebar; compact modal drawer. Close restores launcher, route change focuses main heading. Denied route offers neutral safe exit |
| AD-B-05 | Header search/keyboard-reachable launcher | Local permitted destination labels, no entity results | Input then results in DOM order; Enter navigates, Escape closes, no-result clear. Quick actions only open review |
| AD-B-06 | Reused by later domain owners | Bounded filter/list/card/detail/history patterns; illustrative placeholders only | Form label/help/error summary, review before submit. Conflict reloads authoritative version and preserves safe draft for comparison; no silent overwrite |
| AD-B-07 | Source-authorized action review | Entity/scope/impact/reversibility/expiry and owner-supported preview | Safe cancel initial focus. Confirmation, Step-Up and approval remain distinct. Recheck permissions/version/impact after Step-Up; unknown result checks status before supported retry. No synthetic success/audit ID |

Each generated companion enumerates the entire inherited state list with a view reference and behavior. Broad domain lifecycle states are conditional patterns, not new shell endpoints. For AD-B-03 every state remains unavailable-only. Later C–G must supply actual lifecycle-specific impact, source-read, approval and recovery evidence; the B generic dialog cannot replace those obligations.

## Responsive / RTL / accessibility

Expanded layout starts at the inherited 840 breakpoint: 240px inline-start sidebar, flexible main column, minimum 64px header; inherited 32px desktop margin and 24px tablet/16px compact margins. Sidebar collapses below 840 into a labeled disclosure/modal drawer. No fixed bottom bar obscures focused content. Primary views are generated at 320, 360, 600, 840, 1200 and 1440; variants at 320 and 1440. At 400% on a 1280 viewport, use the equivalent 320 single-column composition. Tables become equivalent labeled cards, retaining row identity and actions.

Logical reading order: skip link → header → navigation → breadcrumb → main heading → content → outcome. RTL does not reverse DOM/focus order. Use Persian-first text; isolate LTR identifiers and integer Toman values. No Wallet or brown palette. Frames use neutral grayscale as low-fidelity notation; production token/typography authority remains Step 54, not the renderer's fallback font.

Use native buttons/links/disclosures, visible names, heading hierarchy, 44px minimum targets and unobscured focus. Modal focus begins on safe cancel, stays inside while modal, Escape cancels and closure restores launcher. Route navigation focuses the main heading. Error summary links to invalid fields and receives focus after failed form submission; noncritical asynchronous status uses polite announcements without focus theft. Loading preserves structure; duplicate submit is disabled. Reduced motion, text spacing and zoom must preserve access. Design evidence is not a runtime screen-reader certification.

## Checks and closure

The validator enforces exact A transport/source hashes, seven B owners, inherited actor/journey/state/operation/facet coverage, all 97 destinations, all four implementation restrictions, FIDO sequence, local search/no-feed boundaries and C NOT_STARTED. Negative tests exercise omissions and invented authority. Generated drift checks include unexpected files, source hashes and all frame contents. Existing full verify checks remain in force.

Canonical closure requires full pnpm verify, diff check, final-head Canonical CI, merge with expected head, remote main re-read and post-merge CI. Stop after B. C starts only under a later instruction.
