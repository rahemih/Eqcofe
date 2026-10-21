# EQCOFE — Step 69-C Admin Pricing / FX / Excel Foundation

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical starting baseline: `3f0cca89f309931ba4ea3877468c6290c8b2a97e`  
Linear: `HOS-73 — Step 69 — Pricing, FX & Excel Administration`  
Risk: **MEDIUM**  
Human Gate: **NOT REQUIRED**

## Entry proof

Step 69-B is terminally canonical:

- PR `#371` merged from approved exact Head `2a4dd9b1a1807934877da19f1d5a9c55d719ddad`;
- exact Artifact `174de7885cc474ea6f30a8335cc8f39cc8ddc1d3a334e120f9bb4bb9853badd0`;
- merge/main SHA `3f0cca89f309931ba4ea3877468c6290c8b2a97e`;
- exact-head Canonical CI #2064, Phase A #1563, CodeQL #1216, deterministic Review, Security and Owner Human Gate passed;
- exact-SHA postmerge Canonical CI #2065 / `39513058979`, Phase A #1564 / `39513059054`, CodeQL #1217 / `39513060271` and Storefront Quality #1013 / `39513058994` passed;
- terminal Step69-B Lock release comment: `6303877602`;
- Linear HOS-73 synchronized to 69-B canonical completion.

Therefore 69-C is authorized to mutate its frozen Admin-only scope.

## Live conflict guard

At Stage-C start:

- canonical `main = 3f0cca89f309931ba4ea3877468c6290c8b2a97e`;
- working branch: `eqcofe/step69-c-pricing-fx-excel-foundation`;
- open PRs `#289` and `#290` are Dependabot dependency/workflow maintenance and do not overlap the Stage-C write scope;
- no active Step69 project implementation PR exists after #371 merge;
- Graph/Graphify remains **RETIRED / OUT OF SCOPE**.

## Frozen 69-C purpose

69-C provides only the shared Admin read/state/transport foundation for the eight Step69 surfaces:

- AD-D-01 — base price/history;
- AD-D-02 — pricing rules;
- AD-D-03 — bulk pricing;
- AD-D-04 — FX rates/impact;
- AD-D-05 — FX-linked rules;
- AD-D-19 — Excel template/dry-run/import/recovery;
- AD-D-20 — Excel Catalog preview/apply;
- AD-D-21 — Excel Pricing preview/apply.

It must not implement the Stage 69-D/E/F/G mutation workflows.

## Source-proven read authority

The canonical generated contract proves exactly these foundation GET reads:

- `GET /admin/pricing/base-prices`;
- `GET /admin/pricing/rules`;
- `GET /admin/pricing/currency-rates`;
- `GET /admin/pricing/currency-rates/current`;
- `GET /admin/pricing/currency-rules`;
- `GET /admin/excel/exports/template`.

AD-D-03 has only operation-id status read authority after an operation exists; no bulk-operation collection read exists. AD-D-20 and AD-D-21 have preview/apply authority but no standalone GET. Stage C therefore exposes those three destinations as explicit action-only boundaries and invents no read endpoint.

## Transport and security boundary

Stage C reuses:

- `createAdminAuthBridge` for server-only Admin cookies;
- canonical `src/generated/openapi.ts` typing through the existing Admin API contract;
- inherited GET-only safe retry policy;
- fail-closed `denied` and `unavailable` classification with request-id recovery;
- the existing permission-gated destination policy and Persian RTL shell.

Stage C introduces no browser credential authority, Step-Up command, Idempotency-Key, If-Match write, automatic mutation retry or stale-data fallback.

## Implemented foundation

Current branch implementation:

- `apps/admin/app/pricing/pricing-foundation.server.ts`
  - freezes the eight Stage-C surfaces;
  - performs only the six canonical GET reads;
  - returns typed ready/denied/unavailable/action-only results;
  - preserves safe auth-cookie forwarding through the existing bridge.
- `apps/admin/app/routes/destination.tsx`
  - upgrades only the eight Step69 destinations from generic handoff to permission-safe read-state foundation;
  - sends only summarized authoritative read state to the browser;
  - discloses non-total counts and action-only endpoint gaps;
  - exposes no mutation controls.
- `apps/admin/scripts/verify-step69-c-pricing-foundation.ts`
  - deterministically verifies scope, exact base, frozen surfaces, endpoint allowlist, auth bridge reuse, absence of mutation methods/write headers and canonical verify wiring.

## Explicit non-authority

69-C does not:

- create/update/activate/deactivate price rules;
- create base prices or perform preview/apply;
- run bulk pricing preview/apply or fabricate bulk history;
- refresh/select/reject/apply FX rates;
- perform FX impact preview/apply;
- upload/import/recover Excel;
- perform Excel Catalog/Pricing preview/apply;
- mutate Backend, OpenAPI, generated contracts, database, Product Design or Current-State;
- touch Inventory/Procurement/POS authority;
- integrate a production FX provider;
- resurrect Graph/Graphify.

## Exit gate

69-D remains blocked until all of the following are complete for the final exact Stage-C Head:

1. Admin Step69-C verifier passes in the canonical Admin verify chain;
2. exact-head Canonical CI, Phase A and CodeQL pass;
3. deterministic Review passes;
4. exact-artifact Scope Lock is ACTIVE;
5. protected merge completes;
6. exact-SHA postmerge Canonical CI, Phase A and CodeQL pass;
7. terminal Scope Lock is RELEASED;
8. Linear HOS-73 is synchronized.

Human Gate is not required because 69-C is MEDIUM risk.

Until then:

```text
STEP_69_C = IN_PROGRESS / NOT_CANONICAL
STEP_69_D = BLOCKED_FROM_MUTATION
```

## CI repair checkpoint

Initial PR Head `3bb7a82bbabb6e118a0a8245b1f675c2e13a3588` exposed two governance-only defects before application type/build verification:

- generated Task Catalog contained a literal `\\n` separator and was not byte-exact;
- the PR event body did not yet include the mandatory canonical `Task Contract:` path.

The catalog formatting was repaired on Head `9b0eb737a60568d8e8cb29e2417bc2f8a037c9d7`, where the generated-catalog exactness test passed. The PR body is now bound to `docs/14-multi-agent/tasks/EQCOFE-STEP69-C-ADMIN-PRICING-FX-EXCEL-FOUNDATION-001.json`. A fresh Head is intentionally emitted after that metadata repair so all exact-head workflows evaluate the corrected PR event snapshot.

No product/runtime scope was expanded by this repair and no prior failed Head is eligible as final evidence.
