# Step 56-C — Catalog, Product and Media

Only C is designed. The immutable A/B contracts remain unchanged; current progression is recorded here and in `step56-catalog-media-wireframes.json`. Eight surfaces, 46 operations, 41 view variants, 114 low-fidelity RTL SVG frames and 133 generated artifacts. D–H remain NOT_STARTED.

## Per-surface acceptance

| Surface | Task / entry | Source-bound result and recovery |
|---|---|---|
| AD-C-01 | Product list → detail → draft/edit → publish/archive/restore/sales | Versioned PATCH; publish active-variant/conditional-price checks. Archive stops sales, restore returns draft. Product detail omits descriptions, so absent fields are not invented or sent blank when untouched. No catalog history endpoint |
| AD-C-02 | Product → variant list → create/edit/sales | SKU/barcode/weight constraints, active vs sales status, version conflict resolved through current list; no price/inventory edit in C |
| AD-C-03 | Attribute definitions → typed values → product/variant assignment | Exactly one typed value, matching attribute ownership/category/context, full-set replacement review. No invented If-Match on assignment PUT |
| AD-C-04 | Product → active media attachment / order / primary / detach | Correct media type, same-product variant, one primary, attached items only. Move-up/down alternatives; detach changes relation only |
| AD-C-05 | Brand list → create/edit/sales | Current version from list; no invented brand deletion/archive. Sales enablement does not override other inherited stops |
| AD-C-06 | Category hierarchy → parent/edit/sales | Existing parent, no self/descendant cycle, current version; labeled parent selection, hierarchy disclosure preserves focus |
| AD-C-07 | Upload request or known media ID → complete → review → reject/delete | No media-library list endpoint invented. Separate upload/complete/approval; only supported MIME and size. Referenced media cannot delete; unavailable storage does not claim upload success |
| AD-C-08 | Scope/action → preview → review → Step-Up → apply | Ten-minute single-use preview, stored count, explicit safe cancel, expired/unknown outcome never blindly retries. Missing fresh recount/requester binding is not claimed as enforced |

The operation records preserve exact source/OpenAPI identity, per-operation permission claims, Step-Up and execution restrictions inherited from A. Persona membership is not an RBAC grant. Source gaps remain NO_ACTION; no backend/API/permission repair or scope removal occurs. B supplies shell/focus/dialog conventions, but these C companions define domain-specific impact and recovery.

## Canonical rules and limitations

### product-lifecycle

create=draft; archive forces sales false; unarchive=draft and preserves stopped sales; archived update/publish/resume prohibited. Publish requires active variant and sellable price only when salesEnabled.

Source: `src/modules/catalog/domain/product.aggregate.ts`.

### version-policy

PATCH product/variant/brand/category and attribute/value updates require existing version. Product publish If-Match is optional in source; UI sends available version without claiming mandatory server enforcement. Other actions do not gain invented concurrency headers.

Source: `src/modules/catalog/presentation/catalog.controller.ts`.

### variant-policy

SKU required max120; optional barcode max120, suffix180, positive integer weight. Active status and salesEnabled differ; inactive resume prohibited.

Source: `src/modules/catalog/domain/variant.aggregate.ts`.

### attribute-policy

Types text/number/boolean/select; exactly one typed value; assignments unique per attribute. PUT replaces the assignment set; no per-assignment optimistic-version guard is claimed.

Source: `src/modules/catalog/application/catalog-structure.service.ts`.

### attribute-scope

Value belongs to attribute; product-vs-variant and primary category must match. Assignment replacement is transactional.

Source: `src/modules/catalog/infrastructure/catalog.repository.ts`.

### media-attachment

Only active media; variant must belong to product; MIME-derived type must match. At most one primary; reorder only attached media with nonnegative integer order. Detach removes relation only.

Source: `src/modules/catalog/infrastructure/catalog.repository.ts`.

### taxonomy-policy

Brand/category name max150 and slug validation; category parent exists, self/descendant cycles prohibited. No delete/archive endpoint for brand/category invented.

Source: `src/modules/catalog/application/taxonomy-command.service.ts`.

### media-upload

JPEG/PNG/WebP/MP4; integer bytes 1..52428800; SHA256 required and calculated locally, not a manual user burden. Complete is separate from upload and approval; dimensions positive integers if supplied.

Source: `src/modules/catalog/application/media.service.ts`.

### media-states

uploading -> processing via complete; processing/quarantine -> active via approve; uploading/processing/quarantine -> rejected; delete fails MEDIA_IN_USE while attached. No media list endpoint or restore endpoint exists in this C scope.

Source: `src/modules/catalog/infrastructure/catalog.repository.ts`.

### media-storage

Configured target uses signed PUT expiring after15min; configuration absence fails closed. No automatic virus-scan, byte verification, thumbnail or actual storage availability claim from these sources. Upload URL and signing material remain hidden.

Source: `src/modules/catalog/infrastructure/configured-media-storage.adapter.ts`.

### sales-preview

Scope global/brand/category/product/variant; non-global requires ID. Preview lasts10min; apply requires existing Step-Up. expected_affected_count compares stored preview count, not a fresh recount; no requester binding is proven by consumeSalesPreview. Do not claim either protection.

Source: `src/modules/catalog/application/sales-control.service.ts`.

### read-boundaries

Admin products accepts limit/cursor only (default25,max100); no invented server q/status filters. Other lists may be unpaginated; UI may locally disclose/segment loaded records without pretending server pagination. No catalog audit-history HTTP endpoint. Product detail omits descriptions; edit does not invent prefill, and omits untouched absent fields.

Source: `src/modules/catalog/application/catalog-query.service.ts`.

No rule above certifies deployed storage availability, virus scanning, concurrency guarantees absent in source, or runtime readiness. Product sales_enabled in the decorated read is effective/price-dependent and must not be used to invent raw own-flag prefill; dedicated stop/resume commands are reviewed explicitly. Business-risk reconciliation is outside this design gate.

## Interaction, states and accessibility

Every inherited state has a view reference and source-aware disposition in each companion. Product publication/archive states apply to products; media states apply to assets/attachments; other surfaces preserve contextual read-only or unsupported behavior. Generic inherited approval/replay/partial-success/audit obligations do not create a new endpoint or workflow. Success requires a current authoritative command/read result, not optimistic UI. Unknown mutation outcome uses existing reads or manual follow-up; no automatic command retry.

Forms retain labels/help and safe draft; failed submission focuses a linked error summary. Passwords, tokens, signed upload URLs and storage keys are not user-facing evidence. LTR SKU/barcode/slug/checksum representations are isolated within Persian RTL; SHA-256 is computed by the client in implementation, not typed by the user. Integer Toman remains inherited, and prices are read-only references in C. No Wallet, brown palette, paid service, invented logo or product imagery.

Dialog focus begins on safe cancel; Escape cancels and restores trigger; Tab stays within an open modal. Media move controls are at least 44px and announce new position while retaining item focus. Category children retain a logical hierarchy independent of visual RTL placement. Filter disclosure is explicitly local to loaded rows; only the product list has source limit/cursor pagination. Missing object/permission states reveal no hidden count or existence.

Primary views exist at 320/360/600/840/1200/1440; variants at320/1440. Inherit B's 840 sidebar switch, logical margins and table-to-card composition. Review equivalent320 CSS-pixel layouts for 400% at1280, long Persian wrapping, text-spacing and focus obstruction. Browser screenshot sampling is static design evidence; no runtime keyboard/screen-reader or actual app zoom certification is claimed.

## Artifacts and verification

`step56-wireframes/C/gallery.html` is a local review index. Manifest hashes cover all deterministic outputs; SVG frames are design evidence, not implemented pages. The validator checks complete source hashes, fixed handoff, exact 8/46 ownership, views/states/actors/permissions, source-specific invariants, restrictions and D NOT_STARTED. Negative tests reject unsupported guarantees and lost coverage. Full pnpm verify and git diff --check must pass, followed by exact-head Canonical CI, expected-head merge, remote main re-read and post-merge CI. Stop after C.
