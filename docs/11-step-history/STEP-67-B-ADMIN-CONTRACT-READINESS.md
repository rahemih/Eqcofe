# EQCOFE — Step 67-B Admin Contract Readiness

Status: **IN_PROGRESS / NOT_CANONICAL**

Canonical base: `87a074ed2d0557234ecfbb615ff7187c36f37f80`  
Linear: `HOS-71`  
Risk: **HIGH**  
Human Gate: **REQUIRED — final exact artifact**

## Purpose

Reconcile the existing Admin authentication/context runtime with executable OpenAPI before any Admin frontend consumes it.

Current runtime already owns:
- username/password → HttpOnly Strict pre-auth cookie;
- WebAuthn registration/authentication challenge and verify;
- HttpOnly Strict Admin session cookie;
- Admin session actor context;
- current staff identity, permissions and scopes;
- Step-Up challenge/verify;
- logout.

The current OpenAPI exposes these operations but leaves successful response bodies untyped. Step 67-B adds response contracts only from actual runtime shapes.

## Dashboard discrepancy

`GET /admin/dashboard` exists in the old assembled OpenAPI/design inventory but no matching runtime controller or permission authority exists. Step 56 already classifies it `UNRESOLVED_NOT_GRANTED`.

67-B therefore retains it only as explicitly annotated contract inventory (`runtime: unresolved_not_granted`, `frontendConsumption: forbidden`) so the frozen Step56 operation/gap lineage stays intact. Its generated response remains untyped and no Admin frontend may consume it. Product Design unavailable-only evidence is retained. No metric/count/feed is created.

## Boundaries

No runtime AuthController, permission guard, database, dependency, Admin frontend or business authorization mutation. Any Step56/57 design artifact change must be generator-equivalent provenance/hash refresh only.

Final exact artifact requires Security, Review, ACTIVE Lock and Project Owner Human Gate.
