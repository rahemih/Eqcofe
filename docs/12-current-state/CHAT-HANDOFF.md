# EQCOFE — Chat Handoff Protocol

**Purpose:** make conversation-to-conversation transfer safe without requiring the full history of previous chats.

## Canonical sources

1. **Technical source of truth:** `rahemih/Eqcofe` on `main`
2. **Current execution state:** `docs/12-current-state/CURRENT-STATE.md`
3. **Canonical roadmap:** `docs/12-current-state/MASTER-ROADMAP.md`
4. **Project management:** Linear project `EQCOFE`
5. **Verification evidence:** GitHub CI / tests / commits

Conversation history is supporting context only. It must not override current canonical GitHub evidence.

## Phase A canonical closure snapshot

- Phase A — Steps 01–28: **CLOSED / FINAL GATE PASS**.
- Steps 01–28 current technical status: `COMPLETE / VERIFIED BY CURRENT CANONICAL BASELINE`.
- Historical attribution remains separate and intentionally limited: Steps 01–27 `UNVERIFIED`; Step 28 `PARTIAL`.
- Technical audit PR: `#144`; exact head `e3cdc336900be3a8d581d8ebfa28a8378bb052d1`; merge commit `ba42d752a0f2db12ccfe6eaee31034e7c8f58643`.
- PR #144 exact-head CI: Canonical CI `33950117727` PASS; Phase A Verification `33950117696` PASS.
- Post-merge Canonical CI on PR #144 merge: `33951504582` PASS.
- Main verification-trigger PR: `#152`; merge/current technical baseline `d6a1695bbb8c9fef6c70f83b4f8d5a131f112063`.
- Exact technical-baseline CI on `main`: Canonical CI `33951615151` PASS; Phase A Verification `33951615134` PASS.
- Closure evidence: `docs/11-step-history/PHASE-A-FINAL-CANONICAL-CLOSURE.md` plus the 28 independent historical-verification documents.
- Valid blocker: NONE.
- This closure proves current canonical behavior; it does not convert current verification into historical provenance.

## Current handoff snapshot

- Official repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Verified Step-54 A1–A10 checkpoint merge: `d44e885c0ec29195929091887daf9f501ba4a65a`
- Checkpoint PR/CI: `#132` / `32858856685` — PASS
- Verified Step-54 A11 library merge: `7d64f814cdba1472470aee99eddce55e8e67f3f8`
- A11 PR/CI: `#134` / `33237646099` — PASS
- Verified Step-53 final closure merge: `a8230752504ccbce364384e53626bd218af730b0`
- Last fully closed step: **Step 55 — Storefront Wireframes — FINAL GATE PASS**
- Verified Step-55 A foundation merge: `75b117582b2e6315091c0e99459ad14b9a4fea0c`
- Verified Step-55 B closure: PR `#138`; final head `956cde6ebbdb9694c9571030608a6f0e0809b506`; exact-head CI `33297193079` / verify `99218795810` — PASS; merge/main `a9a35422347273f35da85ba5e3711a7d9cd3b9a1`; post-merge CI `33297252729` / verify `99218944170` — PASS.
- Active step: **NONE — Step 55 is closed**
- Active substep: **NONE**
- Last completed canonical substep: **Step 55 / F — Content, Policy & Final Audit**
- Step-55 C closure: PR `#140`; final head `adb015b46a90ba8383d0cbf17a149050ebdc1cd0`; exact-head CI `33500791061` / verify `99833400342` — PASS; merge/main `1a45bc71809eeae7e9e0670715a30f2c3069ab32`; post-merge CI `33500900444` / verify `99833752685` — PASS.
- Step-55 D closure: PR `#142`; final head `eea113f25b6ec047c1e575cb87a0b016d96c5c8e`; exact-head CI `33505374371` / verify `99848049249` — PASS; merge/main `b5f2534e6893411462cec219e4b75fd6de5a377a`; post-merge CI `33505503842` / verify `99848460921` — PASS.
- Step-55 E closure: PR `#148`; final head `569f9e56121c163435f89413995ef2a868162a69`; exact-head CI `33595224368` / verify `100137201538` — PASS; merge/main `c6a0db9b6a731f3b9be2614c3a6230296c985419`; post-merge CI `33595332775` / verify `100137520705` — PASS.
- Step-55 F initial evidence: PR `#150`; implementation head `70f5eea102143971b4126f63b480f3120f1a4908`; Canonical CI `33596925507` / verify `100142144317` — PASS.
- Step-55 F final implementation evidence: final head `d85bf44c0f987fabedd843994124caa1576835ac`; CI `33597074463` / verify `100142576021` — PASS; merge/main `ae56fa4cb8a44168aeeb9d92ca7e19ddcf648b94`; post-merge CI `33602772166` / verify `100159960576` — PASS.
- Step-55 final state-sync: PR `#151`; initial head `8080d5cd0208ed0e13bcc740ccbb8340af972dca`; CI `33949134139` / verify `101260481097` — PASS; final evidence head and merge remain transport checks.
- Current action: **NONE — final state synchronization completed**
- Next approved action: **Start Step 56 Admin UX Architecture & Wireframes**
- Step-51 closure PR: **#115 — MERGED**
- Step-51 closure Canonical CI: **32737751481 — PASS**
- Linear project: **EQCOFE**
- Linear current issue: **HOS-13 — Step 55 — Done after final state-sync post-merge CI**

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
