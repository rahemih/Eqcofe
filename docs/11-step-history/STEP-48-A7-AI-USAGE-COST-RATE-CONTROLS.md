# EQCOFE Step 48 / A7 — AI Usage / Cost / Rate Controls

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A7 — AI Usage / Cost / Rate Controls  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A7 adds provider-neutral server-side consumption controls for all current Step-48 generation paths. Admission is reserved atomically before provider execution and settled after provider completion.

## Implementation
- Forward-only migration `0047_ai_usage_cost_rate_controls.sql` creates per-operation usage policies and request reservations.
- `AiUsageRepository` serializes policy admission with `FOR UPDATE`, enforces request/minute, per-request input/output token ceilings, and a daily integer micro-cost budget.
- Cost accounting uses policy-configured input/output micro-cost-per-1k-token rates and remains vendor-neutral.
- `AiUsageControlService` estimates bounded input usage before provider execution, fails closed when rate/budget/usage policy denies admission, and settles actual token usage after success or failure.
- Product Q&A and Draft Content generation both reserve usage before `generateText`, then explicitly settle success/failure.
- No public AI endpoint is introduced by A7.

## Security / ownership
- Controls are server-side and cannot be overridden by prompt or user content.
- Provider failure cannot fabricate successful usage state.
- No Pricing, Inventory, Orders, Payments, Refunds, Finance, permission or Admin mutation authority is introduced.
- Cost accounting is operational AI spend metadata only; it is not customer-facing money and does not alter EQCOFE commerce amounts.
- All stored cost units are integer micro-cost units; no floating-point financial state is persisted.

## Verification evidence
PR: `#40`  
Implementation head: `f4b644de8434428975ca4d5ae6ec2847e1171206`  
Canonical CI run: `32483996493`  
Job: `verify` (`96776325010`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 412 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A7 dedicated tests: 7/7 PASS;
- Runtime tests: 357 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The final documentation/current-state head must also pass Canonical CI before PR #40 is merged to `main`.

## Next safe action
Proceed to **Step 48 / A8** only after final A7 CI PASS and merge to `main`.
