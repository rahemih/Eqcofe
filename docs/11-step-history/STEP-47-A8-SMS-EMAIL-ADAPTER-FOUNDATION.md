# EQCOFE — Step 47 / A8

## SMS + Email Real Adapter Foundation

**Status:** IMPLEMENTED / VERIFICATION PENDING

A8 adds the production-shaped adapter boundary that allows the existing Notifications delivery lifecycle to send SMS and email through configured external providers without selecting or hard-coding a vendor.

## Ownership
- Notifications remains authoritative for recipient resolution, rendering, delivery state, attempts, retries, dead-letter behavior, audit and outbox.
- Integrations owns external provider configuration, secret resolution, resilient HTTP transport, timeout/retry/circuit-breaker behavior and the channel adapter factory.
- No provider credentials are stored in Notifications.
- No SMS/email vendor is selected by A8.

## Adapter contract
`NotificationChannelAdapterFactory` creates a `NotificationProviderPort` for `sms` or `email` from a configured provider key. The adapter:
1. validates channel consistency;
2. requires an enabled provider configuration whose kind matches the channel;
3. resolves the environment-owned secret through the existing secret boundary;
4. uses the shared `ProviderHttpClient` for HTTPS, timeout, bounded retries and circuit breaker;
5. carries the notification delivery id as the provider write idempotency key;
6. maps provider failures to the existing notification retryable/permanent/blocked result model;
7. returns a safe provider message id/request id without persisting credentials or raw secret-bearing responses.

## Configuration
Provider-specific protocol shape remains configuration-driven. Supported non-secret adapter config keys:
- `send_path` (default `/send`)
- `auth_header` (default `authorization`)
- `auth_scheme` (default `Bearer `)

Secrets continue to be referenced through `secret_ref` and resolved from the environment.

## Safety invariants
- No vendor URL or API token is hard-coded.
- Provider kind must equal the notification channel.
- Outbound sends are writes and use idempotency.
- Retry remains bounded by provider configuration and the shared transport.
- Authentication/authorization/invalid-request failures are permanent; transient transport/upstream failures remain retryable.
- Notifications owns final delivery state and retry scheduling.

## Verification
A8 becomes COMPLETE only after Canonical CI passes on the exact branch source.

## Next approved substep
**Step 47 / A9 — Shipping Provider Foundation**
