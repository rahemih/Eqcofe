# EQCOFE Step 48 / A5 — Product Q&A Orchestration + Safe Catalog Context

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A5 — Product Q&A Orchestration + Safe Catalog Context  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A5 implements the read-only Product Q&A application orchestration required by Step 48. It resolves an active governed prompt, reads authoritative public product facts from Catalog, constructs a data-minimized provider payload with explicit prompt-injection boundaries, invokes the configured AI provider, and fails closed on provider or output failure.

A5 intentionally does not expose a public HTTP endpoint yet. Public exposure is deferred until the Step-48 rate/cost control boundary is implemented so provider-backed generation cannot be opened without server-side consumption controls.

## Implementation
- `src/modules/ai/application/product-qa.service.ts`
  - resolves canonical `product-qa` prompt with operation `product_qa`;
  - accepts Persian/Unicode product slugs;
  - validates bounded user questions;
  - loads product facts only through exported `CatalogQueryService`;
  - builds an explicit allow-listed product context;
  - excludes price, internal IDs, SKU, internal notes and unrelated product fields from provider context;
  - separates governed instructions, authoritative context and untrusted user question;
  - adds explicit prompt-injection/security instructions;
  - applies bounded context/input/output sizes;
  - maps provider failure to a safe fail-closed application error without leaking provider details;
  - returns answer plus minimal product identity, prompt version and safe usage/model/request metadata.
- `src/modules/ai/ai.module.ts`
  - imports `CatalogModule` in addition to the existing `IntegrationsModule`;
  - provides/exports `ProductQaService` for later controlled HTTP composition.
- `test/ai-product-qa-a5.spec.ts`
  - Persian slug support;
  - governed prompt binding;
  - Catalog allow-list/data minimization;
  - prompt-injection boundary;
  - input validation;
  - fail-closed provider behavior;
  - read-only/no-HTTP/no-commerce-mutation boundary.
- `test/ai-provider-adapter-a4.spec.ts`
  - preserves the A4 invariant while allowing additive module imports; no A4 test was removed or disabled.

## Security / ownership
- Catalog remains authoritative for product facts.
- AI reads Catalog through the existing query service only; no direct Catalog persistence access is introduced.
- Product Q&A has no Pricing, Inventory, Orders, Payments, Finance, Admin, permission, refund or publication mutation authority.
- Price, internal identifiers/SKU and unrelated/internal fields are not included in the model context in A5.
- Product context is explicitly treated as authoritative data, while the user question is explicitly marked untrusted.
- Instructions embedded in user input or product data cannot confer authorization, tool access or business mutation authority.
- Provider failures are not returned verbatim to callers.
- No raw secrets are persisted or logged by A5.

## Database / API / dependencies
- Database migration: none.
- OpenAPI change: none.
- New runtime dependency: none.
- Public Product Q&A endpoint: intentionally deferred until rate/cost controls exist.

## Verification evidence
PR: `#38`  
Implementation head: `c36541e302fead49c5733a09b5e470c67df7e537`  
Canonical CI run: `32482001230`  
Job: `verify` (`96770193953`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 409 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A5 dedicated tests: 6/6 PASS;
- Runtime tests: 344 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

An initial A5 CI attempt found a legitimate regression-test brittleness in the previously closed A4 suite: its assertion required `IntegrationsModule` to be the only AI module import. A5 necessarily adds `CatalogModule`, so the A4 test was minimally corrected to assert that `IntegrationsModule` remains present among imports. The invariant was preserved; the test was not deleted, skipped or weakened with respect to A4 ownership.

The final documentation/current-state head must also pass Canonical CI before PR #38 is merged to `main`.

## Next safe action
Proceed to **Step 48 / A6 — Draft Content Generation + Human Approval Boundary** only after final A5 CI PASS and merge to `main`.
