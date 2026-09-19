# EQCOFE Storefront Foundation

Stage 58-B bootstraps only the storefront build workspace.

## Boundaries

- React Router Framework Mode on Vite.
- Server-side rendering is enabled by default.
- Business rules, authorization, pricing, payment results and inventory truth remain backend-authoritative.
- Stage B contains no customer feature implementation.
- Environment values are server-only by default.
- Any future `VITE_*` variable is public browser input by definition and must never contain secrets, credentials, tokens, private keys or authoritative business configuration.
- API transport configuration is intentionally deferred to Stage 58-D.

## Stage 58-C shell

- Root document is Persian-first: `lang="fa-IR"`, `dir="rtl"`.
- Shell includes skip-link, banner/header, directly reachable search/cart/account, accessible compact navigation disclosure, contextual breadcrumb, one main landmark and footer.
- Canonical Step 54 tokens are copied into `app/styles/tokens.css` and `shell:verify` fails on any drift against the generated design-system source.
- CSS uses logical properties, 44px target baseline, visible focus, inherited 320/360/600/840/1200/1440 verification widths and reduced-motion handling.
- All actual Step 55 route intents are registered only as placeholders. No API, Auth, pricing, inventory, payment result, cart logic or customer feature authority exists in Stage 58-C.
- Stage 58-D owns API/data foundations; Stage 58-E owns Auth/session; Steps 59–66 replace the placeholders with feature implementations.

