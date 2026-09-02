# EQCOFE — Chat Handoff Protocol

**Purpose:** make conversation-to-conversation transfer safe without requiring the full history of previous chats.

## Canonical sources

1. **Technical source of truth:** `rahemih/Eqcofe` on `main`
2. **Current execution state:** `docs/12-current-state/CURRENT-STATE.md`
3. **Canonical roadmap:** `docs/12-current-state/MASTER-ROADMAP.md`
4. **Project management:** Linear project `EQCOFE`
5. **Verification evidence:** GitHub CI / tests / commits

Conversation history is supporting context only. It must not override current canonical GitHub evidence.

## Current handoff snapshot

- Official repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Verified Step-54 A1–A10 checkpoint merge: `d44e885c0ec29195929091887daf9f501ba4a65a`
- Checkpoint PR/CI: `#132` / `32858856685` — PASS
- Verified Step-54 A11 library merge: `7d64f814cdba1472470aee99eddce55e8e67f3f8`
- A11 PR/CI: `#134` / `33237646099` — PASS
- Verified Step-53 final closure merge: `a8230752504ccbce364384e53626bd218af730b0`
- Last fully closed step: **Step 54 — RTL Design System & Accessibility Foundation — FINAL GATE PASS**
- Verified Step-55 A foundation merge: `75b117582b2e6315091c0e99459ad14b9a4fea0c`
- Verified Step-55 B closure: PR `#138`; final head `956cde6ebbdb9694c9571030608a6f0e0809b506`; exact-head CI `33297193079` / verify `99218795810` — PASS; merge/main `a9a35422347273f35da85ba5e3711a7d9cd3b9a1`; post-merge CI `33297252729` / verify `99218944170` — PASS.
- Active step: **Step 55 — Storefront Wireframes — A/B/C/D COMPLETE; E GATE ACTIVE**
- Active substep: **Step 55 / E — Account, Wholesale & After-Sales**
- Last completed substep: **Step 55 / D — Cart, Checkout & Payment Recovery**
- Step-55 C closure: PR `#140`; final head `adb015b46a90ba8383d0cbf17a149050ebdc1cd0`; exact-head CI `33500791061` / verify `99833400342` — PASS; merge/main `1a45bc71809eeae7e9e0670715a30f2c3069ab32`; post-merge CI `33500900444` / verify `99833752685` — PASS.
- Step-55 D closure: PR `#142`; final head `eea113f25b6ec047c1e575cb87a0b016d96c5c8e`; exact-head CI `33505374371` / verify `99848049249` — PASS; merge/main `b5f2534e6893411462cec219e4b75fd6de5a377a`; post-merge CI `33505503842` / verify `99848460921` — PASS.
- Step-55 E implementation: PR `#148`; head `77b803f0435cfed91945fe2eb8743c59ca46bea6`; Canonical CI `33595054452` / verify `100136712674` — PASS; evidence-sync/final merge pending.
- Current action: **Verify and canonicalize Step 55-E from baseline `ae40460bed512bc8a492ffa101f4e6263cd7c4d3`**
- Next approved action after E merge: **Start Step 55-F Content, Policy, Responsive Audit & Canonical Closure**
- Step-51 closure PR: **#115 — MERGED**
- Step-51 closure Canonical CI: **32737751481 — PASS**
- Linear project: **EQCOFE**
- Linear current issue: **HOS-13 — Step 55 — In Progress**

> Before every new-chat handoff, re-read GitHub `main`, CURRENT-STATE, MASTER-ROADMAP, and the current Linear issue. Do not trust the snapshot above if newer canonical evidence exists.

## Required startup procedure for every new EQCOFE execution chat

A new execution chat must do these steps before changing code:

1. Verify repository `rahemih/Eqcofe`.
2. Verify canonical branch `main`.
3. Read the latest `main` HEAD SHA and latest commit message.
4. Read `docs/12-current-state/CURRENT-STATE.md`.
5. Read `docs/12-current-state/MASTER-ROADMAP.md`.
6. Read this `CHAT-HANDOFF.md`.
7. Read the EQCOFE project and current Step/Issue in Linear.
8. Check whether the current Step/Substep has newer GitHub/CI evidence than Linear.
9. Resolve conflicts in favor of verified GitHub/CI implementation evidence.
10. Report a short `HANDOFF GATE` before implementation.

## HANDOFF GATE format

```text
EQCOFE HANDOFF GATE

Repository: rahemih/Eqcofe
Branch: main
HEAD: <sha>
Latest canonical commit: <message>
Last completed step: <step>
Active/next step: <step>
Active substep: <substep or NONE>
Linear issue: <id>
Build/CI: PASS / FAIL / UNKNOWN
Uncommitted or conflicting work: YES / NO / UNKNOWN
Blockers: <list or NONE>

HANDOFF GATE: PASS / BLOCKED
```

Implementation must not begin until `HANDOFF GATE = PASS`.

## Completion persistence rule

No important execution state may live only in ChatGPT conversation text.

At the end of each significant substep or step, persist applicable evidence to the canonical systems:

- Code / migrations / tests / API contracts → GitHub
- Completion evidence → GitHub commit / PR / CI
- Project status → Linear
- Current position → `CURRENT-STATE.md`
- Roadmap status only when required → `MASTER-ROADMAP.md`

A chat statement such as `A7 COMPLETE` is not sufficient by itself.

## Update rule for CURRENT-STATE

After a verified Step closure, `CURRENT-STATE.md` should clearly contain at least:

- Last Completed Step
- Active / Next Step
- Active Substep when applicable
- Current canonical HEAD or closure commit
- Latest verification / CI evidence
- Open blockers
- Next safe action

Avoid rewriting historical sections unless required. Use minimal documentation changes.

## Linear synchronization rule

Linear is the management control plane, not the technical source of truth.

- Step moves to `Done` only after GitHub/CI closure evidence exists.
- Next Step moves to `Todo` or `In Progress` according to actual execution.
- Blockers should be recorded when they affect execution or launch.
- GitHub links / commit evidence should be attached to important Step issues.

If Linear and GitHub disagree, verify GitHub first and then synchronize Linear.

## Safety rules

During handoff/recovery:

- Do not delete existing source files.
- Do not rename or move existing files without a verified requirement.
- Do not rewrite migrations merely to reconcile documentation.
- Do not force-push canonical history.
- Do not change business rules based only on an old chat.
- Do not restart already completed work without evidence of a defect or gap.
- Do not block normal development for documentation-only drift unless it creates a real safety issue.

## When an old conversation is needed

Previous chats (`Eqcofe`, `Eqcofe 1-1`, `Eqcofe 1-2`, `Eqcofe 1-3`, `Eqcofe 1-4`, ...) should only be revisited when:

- a product/business decision is absent from canonical docs,
- conflicting requirements cannot be resolved from GitHub/Linear,
- provenance of a historical decision is required,
- or the user explicitly asks for historical recovery.

Normal continuation should not require the full prior chat history.

## Goal

A new EQCOFE chat should be able to continue safely using:

`GitHub main + CURRENT-STATE + MASTER-ROADMAP + CHAT-HANDOFF + Linear + CI`

without requiring a manual paste of all previous conversations.
