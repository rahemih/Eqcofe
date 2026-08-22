# EQCOFE Step 48 / A2 — Provider-Agnostic AI Contracts + Failure Model

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A2 — Provider-Agnostic AI Contracts + Failure Model  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope

A2 implements only the provider-neutral AI contract and deterministic failure semantics frozen by A1. It does not add a provider adapter, vendor SDK, database migration, HTTP endpoint, prompt persistence, Product Q&A orchestration, Content integration, or cost/rate persistence.

## Implementation

- `src/modules/ai/domain/ai-provider-contracts.ts`
  - provider-neutral `AiProviderPort`;
  - `text_generation` capability only;
  - Step-48 operations limited to `product_qa` and `draft_content`;
  - governed prompt identity fields (`promptKey`, `promptVersion`) carried in request context without implementing prompt persistence early;
  - explicit finite timeout field;
  - bounded generation input/output contract;
  - provider-neutral usage metadata;
  - discriminated success/failure result.
- `src/modules/ai/domain/ai-provider-failure.ts`
  - normalized AI failure construction;
  - deterministic retry disposition;
  - fail-closed validation of failure metadata.
- `test/ai-provider-contracts-a2.spec.ts`
  - provider-neutral port behavior;
  - retry classification;
  - failure metadata normalization/validation.

## Failure model

Normalized failure kinds cover timeout, network, rate limiting, authentication, authorization, invalid request, provider content blocking, oversized context, unavailable/upstream failure, invalid response, and unknown failures.

Retry behavior is explicit:
- `never`: authentication, authorization, invalid request, content blocked, context too large;
- `safe`: timeout, network, rate limited, unavailable, upstream error;
- `conditional`: invalid response and unknown.

A2 does not itself implement retry loops. Later provider/runtime work must apply bounded retry policy and must remain fail closed.

## Security and ownership

- Provider contracts expose no commerce mutation capability.
- No Pricing, Inventory, Cart/Checkout, Orders, Payments, Refunds, Finance, permissions, secrets, or Admin mutation surface is introduced.
- No raw secret field exists in the provider-neutral request/result contracts.
- No vendor name or vendor SDK is embedded in the AI domain contract.
- `product_qa` and `draft_content` remain advisory/generation operations; A2 creates no publication or authoritative mutation path.
- Model/provider failures are explicit results rather than fabricated success.

## Database / API / dependencies

- Database migration: none.
- OpenAPI change: none.
- New runtime dependency: none.
- Existing migration lineage is untouched.

## Verification evidence

PR: `#35`  
Implementation head verified by Canonical CI: `69c591cfc80b85fe681660738207e9036afa425d`  
Canonical CI run: `32479583308`  
Job: `verify` (`96762878114`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 404 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A2 dedicated tests: 3/3 PASS;
- Runtime tests: 326 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The documentation/current-state commit that records this evidence must also receive Canonical CI PASS before PR #35 is merged. A2 is canonical only after that exact final PR head passes CI and is merged to `main`.

## Next safe action

Proceed to **Step 48 / A3 — Governed Prompt Model + Persistence + Governance Controls** only after the final A2 documentation/current-state head passes Canonical CI and PR #35 is merged.
