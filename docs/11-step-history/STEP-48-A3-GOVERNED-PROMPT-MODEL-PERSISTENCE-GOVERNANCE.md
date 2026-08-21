# EQCOFE Step 48 / A3 — Governed Prompt Model + Persistence + Governance Controls

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A3 — Governed Prompt Model + Persistence + Governance Controls  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A3 implements governed prompt identity, immutable prompt versions, forward-only persistence, staff-only governance controls, optimistic concurrency, and deterministic active-version resolution. It does not add provider adapters, provider secrets/configuration, Product Q&A API, Content generation integration, or cost/rate observability.

## Implementation
- `src/modules/ai/domain/governed-prompt.ts`: prompt key/version/template/operation invariants.
- `database/migrations/0045_ai_governed_prompts.sql`: `ai.prompt_definitions` and append-only `ai.prompt_versions`; active version belongs to the same prompt; version history blocks UPDATE/DELETE.
- `src/modules/ai/infrastructure/governed-prompt.repository.ts`: create/version/activate/disable/resolve persistence with row locking and aggregate CAS.
- `src/modules/ai/application/governed-prompt.service.ts`: staff-only create, add-version, activate, disable, and active resolution.
- `src/modules/ai/ai.module.ts`: exports governed prompt service for later Step-48 composition.
- `test/ai-governed-prompts-a3.spec.ts`: A3 domain, database, governance, resolution, and boundary regression tests.

## Security / ownership
- Prompt management requires a staff actor.
- Prompt history is immutable and deletion is restricted.
- Active selection is explicit and operation-bound (`product_qa` / `draft_content`).
- No raw secret columns or provider credentials are introduced.
- No Pricing, Inventory, Orders, Payments, Finance, permissions, or other commerce mutation path is introduced.
- A3 creates no autonomous publication or tool-execution path.

## Verification evidence
PR: `#36`  
Implementation head: `663d709e90c25bf77cb867ea5e22d9441ef8e0a0`  
Canonical CI run: `32480383438`  
Job: `verify` (`96765233896`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 407 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A3 dedicated tests: 6/6 PASS;
- Runtime tests: 332 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The final documentation/current-state head must also pass Canonical CI before PR #36 is merged to `main`.

## Next safe action
Proceed to **Step 48 / A4 — AI Provider Configuration / Adapter Boundary + Secrets / Resilience Integration** only after final A3 CI PASS and merge to `main`.
