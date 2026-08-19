# EQCOFE Step 42 / A3 — PostgreSQL Customer Core Schema & Migration

Status: **COMPLETE / PASS**
Date: 2026-08-18
Baseline: Step 41 FINAL CANONICAL / CLOSED (`e28f579d549ca77f46590d74e6c3906ce664fd9d15160e1112f07cb3456f314b`)

## Implemented
- `database/migrations/0026_customer_core.sql`
- Customer-owned address book with one-default partial unique index and validation checks.
- Customer wishlist as a unique `(customer_id, product_id)` set with Catalog lineage only.
- Wholesale application persistence and lifecycle `submitted -> under_review -> approved/rejected`.
- One active wholesale application per customer.
- Row-lock eligibility guard and optimistic version guard for wholesale review concurrency.
- Terminal decision immutability, ownership immutability and reviewer immutability.
- Direct retail -> wholesale promotion guard requiring an approved application.
- Deferred commit-time guard preventing approved application / authoritative customer type divergence.
- Admin/customer query indexes required by later Step 42 services.

## Verification
- A3 static invariant audit: 24/24 PASS.
- A3 Node schema tests: 5/5 PASS.
- PostgreSQL 18.4 isolated branch: migration objects and positive/negative lifecycle behavior PASS.
- Negative DB cases verified fail-closed: second default address, duplicate wishlist, second active wholesale application, direct wholesale promotion, direct submitted->approved, terminal mutation/delete, application by already-wholesale customer, approved application without promotion.
- Positive atomic approval path: under_review -> approved + customer_type wholesale in one transaction PASS.
- Exact Node 24.18.1 runtime recovered from Step 41 final GitHub Action artifact and verified.
- OpenAPI: PASS, 510 paths / 579 operations / 1108 refs.
- Architecture: PASS, 294 files.
- Toman / No-Wallet / config-boundary policy: PASS.
- TypeScript build: PASS.
- Existing runtime regression: 34/34 PASS.

## GitHub traceability
Branch: `eqcofe/step42-a3-customer-schema`
Base: `eqcofe/step41-final-gates` (`d92d1eedfd41417cf1a96fb8d4ad8e64e7378299`)
Delta: 3 commits / 3 files, branch ahead by 3 and behind by 0.

Commits:
- `a008c9e128425d39716010d51acb70ca0f1e9f97` — migration
- `b0073541e612aab3e7aab1f298661735accba337` — invariant audit
- `164e3916ae31beb368605b0727723b31a44595b4` — schema tests

Repository note: the connected GitHub repository currently stores CI/traceability scaffolding rather than the full canonical backend source tree. The full implementation artifact remains Library-backed; no claim is made that GitHub alone is a complete clone of the canonical source.

## Safety
- `backup-eqcofe-1` was observed and not modified.
- No default/main database branch was modified; PostgreSQL verification used isolated branch `eqcofe-step42-a3-verify` (`br-muddy-mountain-avr7zc8t`).
- No destructive history operation, force push, secret, wallet, money-unit change, or cross-domain Customer SQL integration was introduced.

## Next
Step 42 / A4 — Customer Profile Service + Repository.
