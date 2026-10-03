# EQCOFE — Step 63-F Address Reference Readiness

## State
**IN_PROGRESS / NOT_CANONICAL**

This governed repair resolves `ADDRESS_REFERENCE_DATA_MISSING` without browser-generated geography IDs or runtime third-party dependencies.

## Source and provenance
- canonical base: `da8d0fb465e85ef37a30e00c71a008cea4a31b25`
- source repository: `Hameds/IranCountryDivisions`
- exact source commit: `68687cf96cc1852d5d38c7283353c80829331758`
- source file: `packages/npm/data/1404/core.json`
- upstream metadata: `مرکز آمار ایران - فایل جغرافیایی سالانه`, year 1404
- normalized subset: **31 provinces / 1481 cities**
- upstream repository license: **MIT**
- notice: `shared/reference/IRAN-GEOGRAPHY-1404-NOTICE.md`

EQCOFE emits stable internal UUID references from the frozen source row identifiers. They are repository-owned reference IDs, not government-issued identifiers.

## Backend authority
`CustomerAddressService` validates province/city pairs on new Address creation and whenever an edit explicitly changes province or city. Edits that leave geography unchanged remain compatible with pre-existing Address rows. Invalid/cross-province pairs fail closed as `ADDRESS_REFERENCE_INVALID`.

## Non-scope
No database migration, OpenAPI shape/status change, dependency, workflow/protection, payment/order business-rule, or Graph/Graphify mutation.

## Handoff
After canonical merge, Stage 63-F PR #309 must consume this same shared reference module for province/city selectors and remove `ADDRESS_REFERENCE_DATA_MISSING`.

## Exit gate
HIGH-risk final artifact requires exact-head Canonical CI, Phase A, CodeQL Security where applicable, deterministic Review, exact-artifact Project Owner HUMAN approval, ACTIVE Lock, protected merge, exact-SHA postmerge verification and terminal Lock release.
