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
