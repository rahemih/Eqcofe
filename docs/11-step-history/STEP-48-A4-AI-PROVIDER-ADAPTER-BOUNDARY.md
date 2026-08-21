# EQCOFE Step 48 / A4 — AI Provider Configuration / Adapter Boundary + Secrets / Resilience Integration

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A4 — AI Provider Configuration / Adapter Boundary + Secrets / Resilience Integration  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A4 connects the AI bounded context to the existing Step-47 Integrations foundation without creating a parallel secret store or HTTP transport. AI-specific contracts remain owned by AI; external configuration, environment secret resolution, timeout/retry and circuit-breaker behavior remain owned by Integrations.

## Implementation
- `database/migrations/0046_integration_ai_provider_kind.sql`: forward-only additive `ai` provider kind.
- `src/modules/integrations/domain/provider-contracts.ts`: additive `ai` provider kind in the generic integration configuration contract.
- `src/modules/ai/infrastructure/configured-ai-provider.adapter.ts`: vendor-neutral configured text-generation adapter using Integrations configuration and resilient HTTP client.
- `src/modules/ai/ai.module.ts`: imports `IntegrationsModule` and exports the configured AI adapter.
- `test/ai-provider-adapter-a4.spec.ts`: A4 configuration, secret-boundary, resilience, fail-closed and ownership tests.

## Security / ownership
- Raw provider secrets remain environment-owned and are resolved only through the existing Integrations secret boundary.
- No AI secret column or credential table is added.
- Provider URL/timeout/retry configuration remains validated by Integrations.
- Outbound generation uses bounded timeout, retry policy, circuit breaker and request-bound idempotency metadata.
- Invalid provider kind, invalid JSON and invalid response shape fail closed.
- AI does not gain Pricing, Inventory, Orders, Payments, Finance or publication authority.
- No Product Q&A or Content HTTP/application integration is introduced in A4.

## Verification evidence
PR: `#37`  
Implementation head: `287b2dacd3f6afd3ba902d57f357b7517b263f91`  
Canonical CI run: `32481083286`  
Job: `verify` (`96767380130`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 408 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A4 dedicated tests: 6/6 PASS;
- Runtime tests: 338 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

An initial CI attempt failed on an incomplete circuit-breaker policy object (`halfOpenMaxCalls` missing). The implementation was corrected and the subsequent Canonical CI passed fully.

The final documentation/current-state head must also pass Canonical CI before PR #37 is merged to `main`.

## Next safe action
Proceed to **Step 48 / A5** only after final A4 CI PASS and merge to `main`.
