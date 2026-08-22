# EQCOFE — Step 47 / A4

## HTTP Client / Timeout / Retry / Circuit-Breaker Foundation

**Status:** COMPLETE / FINAL GATE PASS

A4 adds the shared outbound HTTP resilience layer used by later provider adapters. It introduces no real vendor adapter.

## Frozen behavior
- Every request has a finite validated timeout and uses `AbortController`.
- Retry attempts are bounded; exponential backoff is capped.
- HTTP failures are normalized through the canonical A2 provider failure model.
- Writes cannot retry unless an idempotency key is present.
- `Retry-After` is honored with a bounded delay.
- Provider circuits open after a configured failure threshold and fail closed while open.
- After the open interval, only a bounded half-open probe is allowed.
- Successful probes reset circuit state.
- Production provider URLs must use HTTPS; localhost is allowed for development/testing.
- No business success/default is fabricated on transport failure.

## Files
- `src/modules/integrations/infrastructure/provider-http-client.ts`
- `src/modules/integrations/infrastructure/provider-circuit-breaker.ts`
- `src/modules/integrations/integrations.module.ts`
- `test/integrations-step47-a4.spec.ts`

## Verification
Canonical CI run `32467452912`, job `verify` (`96726992205`) passed:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 390 module files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A4 dedicated tests: 6/6 PASS
- full runtime tests: 264 PASS / 0 FAIL / 0 skipped / 0 cancelled
- overall `pnpm verify`: PASS

Therefore:
**STEP 47 / A4 FINAL GATE = PASS**
**A4 = COMPLETE**

## Next approved substep
**Step 47 / A5 — Provider Health + Observability**
