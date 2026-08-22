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
- Verified canonical HEAD at snapshot creation: `de0cd36237ce51e2acb87a12b432b121b42e8a9d`
- Last fully closed step: **Step 48 — EQCOFE AI Backend Foundation — CLOSED / FINAL GATE PASS**
- Deferred closure: **Step 49 A1–A10 complete; A11 intentionally deferred until Step 53**
- Active step: **Step 50 — Excel Product & Pricing Management Backend**
- Last completed substep: **Step 50 / A3 — COMPLETE / FINAL GATE PASS**
- Next approved substep: **Step 50 / A4 — Catalog Dry-Run Validation + Row-Level Error Model**
- Latest merged PR: **#70**
- Latest exact-head Canonical CI: **32573327905 — PASS**
- Linear project: **EQCOFE**
- Linear current issue: **RE-VERIFY before execution; do not reuse the stale Step-48 issue reference**

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
