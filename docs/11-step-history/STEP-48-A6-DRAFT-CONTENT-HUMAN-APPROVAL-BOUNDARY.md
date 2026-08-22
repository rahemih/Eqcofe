# EQCOFE Step 48 / A6 — Draft Content Generation + Human Approval Boundary

**Step:** 48 — EQCOFE AI Backend Foundation  
**Substep:** A6 — Draft Content Generation + Human Approval Boundary  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A6 implements governed AI article-draft generation while preserving Content as the authoritative owner of article persistence and editorial lifecycle. AI may generate and create a Content-owned `draft`, but it has no authority to approve, schedule or publish content.

## Implementation
- `src/modules/ai/application/draft-content-generation.service.ts`
  - resolves the active governed `draft-content` prompt for `draft_content`;
  - treats the staff-provided content brief as untrusted input;
  - enforces bounded brief/provider input/output sizes;
  - requires provider output to be strict JSON containing only `title_fa`, `body`, `seo_title`, `meta_description`;
  - rejects malformed, unexpected-field and obvious unsafe generated output;
  - persists only through exported Content `ArticleDraftService`;
  - verifies the resulting Content state is `draft`;
  - returns `approval_required: true` plus safe usage/model/request metadata.
- `src/modules/ai/ai.module.ts`
  - imports `ContentModule` additively;
  - provides/exports `DraftContentGenerationService`.
- `test/ai-draft-content-a6.spec.ts`
  - governed-prompt binding;
  - untrusted-brief/prompt-injection boundaries;
  - strict output-schema validation;
  - unsafe-output rejection before persistence;
  - fail-closed provider handling;
  - no Editorial approval/publish/schedule or direct Content persistence.
- `test/ai-product-qa-a5.spec.ts`
  - keeps the A5 module-import invariant additive so future legitimate AI-module imports do not invalidate closed A5 behavior; no test was removed or disabled.

## Security / ownership
- Content remains authoritative for article storage, version history, review, approval, scheduling and publication.
- AI invokes only `ArticleDraftService.create` and never `ArticleEditorialService`.
- Generated content is untrusted application input and must pass strict structural validation before entering Content.
- User/staff brief cannot confer permission, tool, publication or commerce authority.
- AI cannot approve, schedule, publish or bypass Content editorial state transitions.
- No Pricing, Inventory, Orders, Payments, Refunds, Finance, permission or Admin state mutation is introduced.
- No raw secret is persisted or emitted by A6.

## Database / API / dependencies
- Database migration: none.
- OpenAPI change: none.
- New runtime dependency: none.
- Public AI endpoint: none.

## Verification evidence
PR: `#39`  
Implementation head: `8083244637c2d3862e886fe518f748a0ee4d4b8f`  
Canonical CI run: `32483061869`  
Job: `verify` (`96773456625`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 410 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A6 dedicated tests: 6/6 PASS;
- Runtime tests: 350 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The final documentation/current-state head must also pass Canonical CI before PR #39 is merged to `main`.

## Next safe action
Proceed to **Step 48 / A7 — AI Usage / Cost / Rate Controls** only after final A6 CI PASS and merge to `main`.
