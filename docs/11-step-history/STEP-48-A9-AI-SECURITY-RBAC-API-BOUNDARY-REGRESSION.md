# EQCOFE Step 48 / A9 — AI Security / RBAC / API Boundary + Regression Gate

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A9 — AI Security / RBAC / API Boundary + Regression Gate  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope

A9 closes the security and API-boundary hardening required before Step-48 final closure. It does not introduce a new public AI HTTP endpoint. The existing application services remain internal module surfaces and OpenAPI remains unchanged while continuing to validate successfully.

## Security hardening

A9 identified and fixed a prompt-boundary weakness in the A5/A6 composition model: untrusted user text was inserted directly between XML-like tags, allowing crafted closing tags to imitate prompt structure.

The hardened boundary now:
- NFKC-normalizes and bounds untrusted text;
- rejects control characters before provider execution;
- frames untrusted values as JSON data inside explicit `*_JSON` sections;
- keeps governed instructions separate from untrusted JSON-framed data;
- validates model output before it can leave the AI application boundary;
- rejects executable or secret-like model output such as script/javascript payloads or apparent authorization/token/secret material.

Product Q&A continues to receive only allow-listed Catalog facts and remains read-only. Draft generation continues to persist only through Content-owned `ArticleDraftService` and remains draft-only with mandatory human approval.

## RBAC / API boundary

- Governed prompt mutations remain staff-only through `GovernedPromptService` request-context enforcement.
- `src/modules/ai/presentation` contains no AI controller and A9 adds no HTTP bypass around usage controls, governed prompts, Content approval, or Catalog ownership.
- No Pricing, Inventory, Orders, Payments, Refunds, Finance, Permission, Secret or Admin mutation authority is introduced.
- No autonomous tool execution or general-purpose agent capability is introduced.
- OpenAPI is intentionally unchanged in A9 and still validates PASS.

## Regression gate

A9 preserves all focused Step-48 regression suites A2 through A8 and adds a dedicated A9 security suite.

The first A9 CI run `32486223454` failed only because the A9 suite-presence assertion referenced the A8 test with the wrong filename (`ai-observability-a8.spec.ts`). The canonical existing filename is `ai-safe-observability-a8.spec.ts`. The assertion was corrected without removing or disabling any test.

## Verification evidence

PR: `#42`  
Implementation head: `7592a4953f7bf23cf4bc59912a2080c30725db08`  
Canonical CI run: `32486347684`  
Job: `verify` (`96783623659`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 415 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A9 dedicated tests: 7/7 PASS;
- Runtime tests: 370 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The final documentation/current-state head must also pass Canonical CI before PR #42 is merged to `main`.

## Next safe action

Proceed to **Step 48 / A10 — Final Canonical Closure** only after the exact final A9 head passes Canonical CI and PR #42 is merged to `main`.
