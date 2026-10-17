# Step 68-G — Sales-Control preview/apply administration

Status: **IN_PROGRESS / HIGH / NOT_CANONICAL**

Canonical base: `9230e88178f5ffa5d2352126ee4edac57f021fec`  
Linear: `HOS-72`  
Task Contract: `docs/14-multi-agent/tasks/EQCOFE-STEP68-G-SALES-CONTROL-001.json`

## Goal

Implement only the source-proven **AD-C-08** Admin Sales-Control flow:

1. choose scope: global / brand / category / product / variant;
2. request authoritative preview;
3. review exact returned impact and preview expiry;
4. perform WebAuthn Step-Up;
5. submit apply exactly once with the reviewed preview id and affected count;
6. fail closed on expired, consumed or ambiguous outcomes.

## Canonical authority

Runtime:
- `POST /admin/sales-control/preview`
- `POST /admin/sales-control/apply`
- permission: `sales_control.manage`
- apply is protected by existing `@RequireStepUp()`.

Preview invariants:
- non-global scope requires `scope_id`;
- lifetime = 600 seconds;
- preview is single-use;
- `affected_count` is the stored preview count;
- apply compares `expected_affected_count` with that stored count, **not** a fresh recount;
- requester binding is not source-proven and must not be claimed.

## Interaction contract

AD-C-08 preserves these views:
- `scope`
- `preview`
- `apply`
- `expired`
- `unknown`

The apply review keeps safe cancel as initial focus, Escape cancels and restores the launcher, and the unsafe apply is never automatically retried.

## Explicit exclusions

68-G does **not** implement:
- generic bulk product-field editing;
- Media, Product/Variant lifecycle or Taxonomy mutations beyond already-canonical earlier stages;
- pricing, inventory, FX or Excel — Step 69;
- Backend, OpenAPI, generated-contract or database mutation;
- Storefront runtime changes;
- Product Design semantic changes;
- Current-State / Master-Roadmap final reconciliation — 68-I;
- Step 68-H acceptance or Step 69 work.

## Governance

Risk = **HIGH**. Final exact-artifact Project Owner Human Gate is required only after:
- Canonical CI PASS;
- Phase A PASS;
- CodeQL PASS;
- deterministic Review PASS;
- Independent Security PASS;
- exact-artifact Scope Lock ACTIVE.

Until then:

`STEP_68_G = IN_PROGRESS / NOT_CANONICAL`  
`STEP_68_H = BLOCKED_FROM_MUTATION`
