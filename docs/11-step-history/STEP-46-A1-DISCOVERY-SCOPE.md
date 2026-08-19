# EQCOFE Step 46 / A1 — Discovery, Scope Recovery & Business Rules Freeze

**Step:** 46 — Marketing, Promotions & Customer Club Backend  
**Substep:** A1 — Discovery, Scope Recovery & Business Rules Freeze  
**Date:** 2026-08-19  
**Status:** COMPLETE

## 1. Canonical inputs

A1 is grounded in the canonical repository and current Step-46 roadmap. Step 45 is treated as already closed by its final reference; no Step-45 implementation is repeated here.

Canonical Step-46 scope:
- campaigns and promotion lifecycle;
- first-purchase/festival promotions;
- coupon/promotion eligibility;
- deterministic composition with Pricing and Orders;
- customer points/club ledger only if retained for MVP;
- no Wallet semantics;
- auditable administrative operations.

## 2. Repository discovery

The repository already contains dedicated module boundaries for both:

- `src/modules/marketing`
- `src/modules/loyalty`

Both module shells are already registered through `DomainModulesModule`. Their application/domain/infrastructure/presentation directories are currently placeholders, so Step 46 must implement within these existing boundaries rather than creating competing modules.

Relevant existing commerce ownership remains outside Marketing/Loyalty:

- Pricing owns authoritative base/final price calculation and price rules.
- Cart/Checkout owns checkout snapshots and currently stores `subtotal_toman`, `discount_toman`, `shipping_toman`, `tax_toman`, `total_toman`, per-line base/final price and discount snapshots.
- Orders consumes the reserved checkout snapshot rather than recalculating commercial facts independently.
- Customer owns customer/wholesale identity and eligibility inputs.
- Finance owns downstream financial/profit accounting.

## 3. Bounded-context ownership freeze

### Marketing owns
- Campaign identity and lifecycle.
- Promotion definitions.
- Coupon definitions/codes.
- Promotion eligibility policy.
- Activation windows and usage limits.
- Redemption reservation/consumption/release state needed for concurrency safety.
- First-purchase and festival-promotion rules.
- Marketing audit/outbox events.

### Loyalty owns
- Customer points ledger only.
- Earn/reverse/expire/adjust ledger entries when the MVP portion is implemented.
- Point balance as a derived projection, never as stored money.

### Marketing/Loyalty must not own
- Base product prices.
- Wholesale price ownership.
- Cart ownership.
- Order lifecycle.
- Payment/refund lifecycle.
- Inventory.
- COGS/profit ownership.
- Wallet, stored-value balance, cash-equivalent account, withdrawal or transfer semantics.

## 4. Frozen business rules for Step 46

1. All monetary values are integer **Toman**.
2. Wallet semantics remain forbidden.
3. Promotion is applied after authoritative Pricing input; Marketing does not mutate base prices.
4. A discount can never produce a negative payable amount.
5. Every applied discount must remain explainable by immutable order/checkout snapshots.
6. Coupon and promotion eligibility must be evaluated server-side.
7. Usage limits require concurrency-safe enforcement.
8. Retried checkout/payment requests must not consume the same redemption twice.
9. Failed/abandoned checkout must not permanently burn a redemption unless an explicit finalization rule says so.
10. Order creation must consume the same promotion result that was validated/reserved for that checkout; no silent re-pricing divergence.
11. First-purchase eligibility must be based on authoritative successful/completed commercial history, not merely customer creation time.
12. Anonymous/guest first-purchase promotion is not assumed unless a verified identity rule is introduced later.
13. Wholesale interaction must be explicit and deterministic; no implicit stacking with wholesale pricing.
14. Promotion stacking defaults to **not stackable** unless an explicit rule permits a combination.
15. The same coupon cannot be applied more than once to the same checkout/order.
16. Refund/cancellation/reversal effects on redemptions and points must be represented explicitly and idempotently.
17. Sensitive campaign/coupon administrative mutations require RBAC, audit and existing Step-Up/idempotency conventions where applicable.
18. Deletion of historical campaign/redemption facts is not allowed; lifecycle deactivation/archive is preferred.
19. Customer points are non-cash, non-transferable and must never be withdrawable or convertible into a Wallet balance.
20. Advanced segmentation, AI marketing, personalization, gamification and complex loyalty tiers are outside launch-critical Step-46 scope.

## 5. Launch classification

### LAUNCH CRITICAL
- Campaign/promotion core.
- Coupon validation.
- Eligibility rules.
- First-purchase promotion.
- Activation windows.
- Global/per-customer usage limits.
- Non-stacking/conflict rules.
- Redemption reservation/finalization/release.
- Pricing + Cart/Checkout integration.
- Order snapshot/integrity integration.
- Refund/cancellation correctness where promotion facts are affected.
- RBAC, audit, idempotency and concurrency protections.
- Database, API and regression coverage.

### LAUNCH PREFERRED
- Festival campaign administration beyond minimum activation-window support.
- Minimal customer club/points ledger if it does not destabilize launch-critical commerce.

### POST-LAUNCH
- Loyalty tiers.
- Gamification.
- Referral programs unless separately approved.
- Advanced segmentation.
- Personalized discounts.
- Recommendation-driven campaigns.
- AI marketing automation.
- Cash-equivalent points or any Wallet-like feature.

## 6. Step-46 substep plan

- **A1** Discovery + Scope/Rules Freeze — COMPLETE
- **A2** Marketing Domain Model + Invariants
- **A3** PostgreSQL Schema + RBAC
- **A4** Campaign Lifecycle Engine
- **A5** Coupon + Eligibility Engine
- **A6** First-Purchase + Festival Promotions
- **A7** Pricing/Cart/Checkout Integration
- **A8** Order + Redemption + Financial Integrity
- **A9** Customer Club / Points MVP Foundation
- **A10** Admin API + RBAC + Audit + Idempotency
- **A11** E2E + Concurrency + Security + Regression
- **A12** Final Canonical Closure

## 7. A1 acceptance criteria

- Canonical Step-46 scope recovered: PASS
- Existing Marketing/Loyalty module boundaries identified: PASS
- Cross-domain ownership with Pricing/Cart/Orders/Customer/Finance frozen: PASS
- Toman rule preserved: PASS
- No-Wallet rule preserved: PASS
- Launch classification completed: PASS
- Substep sequence frozen: PASS
- No production source code changed in A1: PASS

## 8. Verification note

A1 is a discovery/scope/documentation substep and introduces no production-code or schema change. Therefore no new runtime regression result is claimed for this substep. Code/build/database gates become mandatory from the implementation substeps onward.

## 9. Next action

Proceed to **Step 46 / A2 — Marketing Domain Model + Invariants** and define the exact aggregate/state-machine model before creating migrations.
