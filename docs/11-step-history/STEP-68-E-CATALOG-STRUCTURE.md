# EQCOFE — Step 68-E Catalog Structure Administration

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `de4f72a4c2e9c4d3d48762e778f45d3644d9c727`  
Linear: `HOS-72`  
Risk: **MEDIUM**  
Human Gate: **NOT_REQUIRED**

## Entry proof

Step 68-D is terminally canonical:

- PR: `#364`;
- exact approved head: `57c7db4f6363b479332ef326a4788a47ac9312c5`;
- artifact: `eb331bd18a86bc25a2f07dd6a8a6c25b5ae89c33e5e06bcb890a83b3fe5a9750`;
- canonical merge/main SHA: `de4f72a4c2e9c4d3d48762e778f45d3644d9c727`;
- exact-SHA Canonical CI #1945, Phase A #1444, CodeQL #1097 and Storefront Quality #923 = **SUCCESS**;
- terminal Step 68-D Lock release comment: `6230507852`.

## Purpose

68-E implements the canonical Admin structure workspaces for:

- AD-C-03 Attribute definitions, values and Product/Variant assignment;
- AD-C-05 Brand list/create/edit/sales;
- AD-C-06 Category hierarchy/create/edit/sales.

All runtime calls must reuse the existing server-side Admin auth bridge. Browser code receives no raw credentials.

## Frozen authority

### Brand

Source-proven operations:
- `GET /admin/brands`;
- `POST /admin/brands`;
- `PATCH /admin/brands/{id}` with canonical If-Match;
- `POST /admin/brands/{id}/stop-sales`;
- `POST /admin/brands/{id}/resume-sales`.

There is no source-proven Brand delete/archive endpoint; none may be invented.

### Category

Source-proven operations:
- `GET /admin/categories`;
- `POST /admin/categories`;
- `PATCH /admin/categories/{id}` with canonical If-Match;
- `POST /admin/categories/{id}/stop-sales`;
- `POST /admin/categories/{id}/resume-sales`.

Parent must exist. Self/descendant cycles are prohibited by the canonical backend and must not be reimplemented as an alternative authority. There is no source-proven Category delete/archive endpoint.

### Attribute definitions and values

Source-proven operations:
- `GET /admin/attributes`;
- `POST /admin/attributes`;
- `PATCH /admin/attributes/{id}` with canonical If-Match;
- `GET /admin/attributes/{id}/values`;
- `POST /admin/attributes/{id}/values`;
- `PATCH /admin/attribute-values/{id}` with canonical If-Match.

Allowed attribute types are `text | number | boolean | select`.
A value payload must contain exactly one of text, numeric or boolean.

### Product and Variant assignments

Source-proven operations:
- `GET/PUT /admin/products/{product_id}/attributes`;
- `GET/PUT /admin/variants/{id}/attributes`.

PUT replaces the complete assignment set. No If-Match header is declared for these assignment endpoints and none may be invented. Backend remains authoritative for value ownership, category compatibility and product/variant scope.

## Mutation safety

- no automatic retry for POST/PATCH/PUT;
- exact If-Match only where the contract declares it;
- conflict and unknown-outcome states fail closed;
- after mutation, canonical state is re-read before success is represented;
- direct Backend error text is not exposed to the operator;
- form mutation requires trusted same-origin submission and bounded parsing.

## Explicitly out of scope

68-E does **not** implement:
- product/variant lifecycle beyond inherited 68-D;
- media administration — 68-F;
- Sales-Control bulk preview/apply — 68-G;
- pricing, inventory, FX or Excel — Step 69;
- Backend/OpenAPI/generated-contract/database changes;
- Storefront changes;
- Product Design mutations;
- Current-State / Master Roadmap terminal reconciliation — 68-I;
- Graph/Graphify.

## Execution branch

`eqcofe/step68-e-catalog-structure`

Task Contract:
`docs/14-multi-agent/tasks/EQCOFE-STEP68-E-CATALOG-STRUCTURE-001.json`

## Exit gate

68-F remains blocked until:
1. exact-head Canonical CI PASS;
2. exact-head Phase A PASS;
3. exact-head CodeQL PASS;
4. deterministic Review PASS;
5. exact-artifact Scope Lock ACTIVE;
6. protected merge;
7. exact-SHA postmerge Canonical CI / Phase A / CodeQL PASS;
8. terminal Lock RELEASED;
9. Linear `HOS-72` records `STEP_68_E = CANONICAL_COMPLETE`.

No Project Owner Human Gate is required for this frozen MEDIUM-risk stage.
