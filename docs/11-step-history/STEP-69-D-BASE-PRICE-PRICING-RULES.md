# EQCOFE — Step 69-D Base Price / Pricing Rules Administration

Status: **IN_PROGRESS / NOT_CANONICAL / HUMAN_GATE_REQUIRED**

Canonical starting baseline: `15f695a850c1bee124223c4c1dd4e1747cc856de`  
Linear: `HOS-73 — Step 69 — Pricing, FX & Excel Administration`  
Risk: **HIGH**  
Human Gate: **REQUIRED**

## Entry proof

Step 69-C is terminally canonical:

- PR `#372` merged exact Head `d2442ee35481018eec51b7c42bb7621007b0699c`;
- exact Artifact `1454764e94e88880df634519b14fdb222ae63dd4a4145c27acb762ee7b7c224d`;
- canonical merge/main SHA `15f695a850c1bee124223c4c1dd4e1747cc856de`;
- exact-head Canonical CI #2071, Phase A #1570, CodeQL #1223, Prototype #1482 and deterministic Review passed;
- exact-SHA postmerge Canonical CI #2072, Phase A #1571 and CodeQL #1224 passed;
- terminal Stage-C Lock release comment: `6308184802`.

Therefore 69-D is authorized to mutate its frozen Admin-only scope.

## Live conflict guard

At Stage-D start:

- canonical `main = 15f695a850c1bee124223c4c1dd4e1747cc856de`;
- working branch: `eqcofe/step69-d-base-price-pricing-rules`;
- open PRs #289 and #290 are Dependabot maintenance and do not overlap the Stage-D write scope;
- no other Step69 implementation PR is open;
- Graph/Graphify remains **RETIRED / OUT OF SCOPE**.

## Frozen Stage-D surfaces

Only:

- `AD-D-01` — قیمت پایه و تاریخچه;
- `AD-D-02` — قواعد قیمت‌گذاری.

69-E Bulk Pricing, 69-F FX and 69-G Excel remain blocked.

## Source-proven authority

Stage D uses only:

### Base price

- `GET /admin/pricing/base-prices` — permission `pricing.view`;
- `POST /admin/pricing/base-prices/preview` — permission `pricing.manage`;
- `POST /admin/variants/{variant_id}/prices` — permission `pricing.manage`.

The runtime accepts a `variant_id` query on the history controller, but the generated OpenAPI GET contract does not expose a query parameter. Admin therefore performs any variant filter **locally over the loaded canonical response** and discloses that boundary.

The generic `POST /admin/pricing/base-prices` generated request body does not carry `variant_id`. Stage D intentionally does not use or extend it. Creation uses the typed variant-specific route instead of inventing out-of-contract body authority.

Base-price preview is informational only. It creates no apply token, no write permission and no automatic follow-up.

### Pricing rules

- `GET /admin/pricing/rules`;
- `POST /admin/pricing/rules`;
- `GET /admin/pricing/rules/{id}`;
- `PATCH /admin/pricing/rules/{id}` with exact `If-Match`;
- `POST /admin/pricing/rules/{id}/activate`;
- `POST /admin/pricing/rules/{id}/deactivate`.

No delete operation exists.

The read contract exposes `is_global` but does not expose non-global scope IDs. Stage D never fabricates those IDs. Scopes are supplied only on create; PATCH does not claim to edit scopes.

## Mutation safety

Stage D reuses `createAdminAuthBridge` and canonical generated request/response types.

No Stage-D mutation is protected by a source-proven Idempotency-Key. Therefore:

- transport/network ambiguity becomes `unknown_outcome`;
- no automatic mutation replay occurs;
- the UI instructs the operator to reread canonical state before another action.

Pricing Rule PATCH:

- carries exact `If-Match` from the read version;
- treats 409/412/428 as explicit conflict;
- never silently overwrites a newer version.

No source Stage-D operation requires Step-Up. Admin does not invent one.

## Implemented administration

Current branch includes:

- `apps/admin/app/pricing/pricing-admin.server.ts`
  - typed read/preview/create/rule lifecycle calls;
  - variant-specific base-price creation;
  - If-Match rule update;
  - fail-closed denied/conflict/invalid/not-found/unknown-outcome/unavailable classification.
- `apps/admin/app/pricing/pricing-form.server.ts`
  - same-origin mutation gate;
  - UUID/text/numeric/timestamp/version/enum validation;
  - ISO timestamps must carry explicit timezone;
  - bounded multi-scope syntax with global exclusivity.
- `/pricing/base-prices`
  - authoritative loaded history;
  - disclosed local variant filtering;
  - informational profit-guard preview;
  - explicit final create action and no automatic replay.
- `/pricing/rules`
  - list/detail/create/update/activate/deactivate;
  - no delete UI;
  - immutable source-type/value-type/scope boundaries on PATCH;
  - explicit stale-version conflict recovery.
- Admin shell navigation maps AD-D-01/02 to these routes.
- responsive RTL/token-based pricing stylesheet.

## Explicit non-authority

69-D does not:

- implement Bulk Pricing preview/apply/status;
- implement FX refresh/select/reject/rules/impact/apply;
- implement Excel dry-run/import/recovery/catalog/pricing apply;
- mutate Backend, OpenAPI, generated contracts, database, Product Design, Storefront or Current-State;
- touch Inventory/Procurement/POS authority;
- integrate a production FX provider;
- resurrect Graph/Graphify.

## Exit gate

69-E remains blocked until the final exact Stage-D artifact completes:

1. deterministic Stage-D verifier and Admin canonical verify;
2. exact-head Canonical CI, Phase A and CodeQL;
3. deterministic Review PASS;
4. independent Security PASS;
5. exact-artifact Scope Lock ACTIVE;
6. **Project Owner Human Gate APPROVED** for that exact Head/Artifact;
7. protected merge;
8. exact-SHA postmerge Canonical CI, Phase A and CodeQL;
9. terminal Scope Lock RELEASED;
10. Linear HOS-73 synchronized.

Until the exact-artifact owner approval:

```text
STEP_69_D = IN_PROGRESS / NOT_CANONICAL / HUMAN_GATE_REQUIRED
STEP_69_E = BLOCKED_FROM_MUTATION
```
