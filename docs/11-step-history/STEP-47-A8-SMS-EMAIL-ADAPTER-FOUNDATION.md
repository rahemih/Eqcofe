# EQCOFE — Step 47 / A8

## SMS + Email Real Adapter Foundation

**Status:** COMPLETE / FINAL GATE PASS

A8 adds the production-shaped adapter boundary that allows the existing Notifications delivery lifecycle to send SMS and email through configured external providers without selecting or hard-coding a vendor.

## Ownership
- Notifications remains authoritative for recipient resolution, rendering, delivery state, attempts, retries, dead-letter behavior, audit and outbox.
- Integrations owns external provider configuration, secret resolution, resilient HTTP transport, timeout/retry/circuit-breaker behavior and the channel adapter factory.
- No provider credentials are stored in Notifications.
- No SMS/email vendor is selected by A8.

## Adapter contract
`NotificationChannelAdapterFactory` creates a `NotificationProviderPort` for `sms` or `email` from a configured provider key. It validates channel/kind, resolves environment-owned secrets, uses the shared resilient HTTP client, propagates delivery idempotency, and maps provider failures into existing notification delivery semantics.

## Configuration
Non-secret adapter config remains provider-driven: `send_path`, `auth_header`, and `auth_scheme`. Secrets remain referenced through `secret_ref` and resolved from the environment.

## Safety invariants
- No vendor URL or API token is hard-coded.
- Provider kind must equal the notification channel.
- Outbound sends are idempotent writes.
- Retry is bounded by provider configuration and shared transport.
- Authentication/authorization/invalid-request failures are permanent; transient transport/upstream failures are retryable.
- Notifications owns final delivery state and retry scheduling.

## Verification evidence
Canonical CI run `32471231262`, job `verify` (`96738236635`) passed on A8 source commit `927ae2bb21628c9c3c1df5c169eee9bc239fa12d`:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 398 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A8 dedicated tests: **8/8 PASS**
- runtime tests: **292 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

An earlier CI attempt correctly failed on an incomplete circuit-breaker policy; `halfOpenMaxCalls: 1` was added and the exact corrected source passed the final gate.

## Next approved substep
**Step 47 / A9 — Shipping Provider Foundation**
