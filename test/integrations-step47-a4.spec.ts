import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ProviderCircuitBreaker } from '../src/modules/integrations/infrastructure/provider-circuit-breaker';
import { ProviderHttpClient } from '../src/modules/integrations/infrastructure/provider-http-client';

const policy = { failureThreshold: 2, openMs: 1000, halfOpenMaxCalls: 1 };

test('A4 circuit breaker opens after bounded failures and permits one half-open probe', () => {
  const breaker = new ProviderCircuitBreaker();
  assert.equal(breaker.canExecute('fx-main', policy, 0), true);
  breaker.recordFailure('fx-main', policy, 0);
  assert.equal(breaker.canExecute('fx-main', policy, 10), true);
  breaker.recordFailure('fx-main', policy, 10);
  assert.equal(breaker.canExecute('fx-main', policy, 20), false);
  assert.equal(breaker.canExecute('fx-main', policy, 1010), true);
  assert.equal(breaker.canExecute('fx-main', policy, 1011), false);
  breaker.recordSuccess('fx-main');
  assert.equal(breaker.canExecute('fx-main', policy, 1012), true);
});

test('A4 rejects insecure provider URL before transport', async () => {
  const client = new ProviderHttpClient(new ProviderCircuitBreaker());
  await assert.rejects(() => client.execute({ providerKey:'x', url:'http://example.com', context:{requestId:'r',operation:'read',timeoutMs:1000}, maxAttempts:1, circuitBreaker:policy }), /PROVIDER_HTTP_INSECURE_URL/);
});

test('A4 write retries require idempotency key', async () => {
  const client = new ProviderHttpClient(new ProviderCircuitBreaker());
  await assert.rejects(() => client.execute({ providerKey:'x', url:'https://example.com', method:'POST', context:{requestId:'r',operation:'write',timeoutMs:1000}, maxAttempts:2, circuitBreaker:policy }), /PROVIDER_WRITE_RETRY_REQUIRES_IDEMPOTENCY/);
});

test('A4 transport has finite AbortController timeout and bounded attempts', async () => {
  const source = await readFile('src/modules/integrations/infrastructure/provider-http-client.ts','utf8');
  assert.match(source,/AbortController/);
  assert.match(source,/setTimeout\(\(\) => controller\.abort\(\), request\.context\.timeoutMs\)/);
  assert.match(source,/request\.maxAttempts > 6/);
  assert.match(source,/Math\.min\(250 \* \(2 \*\* \(attempt - 1\)\), 5_000\)/);
});

test('Step 52 A6 rejects provider redirects at the shared transport boundary', async () => {
  const original = globalThis.fetch;
  let redirect: RequestRedirect | undefined;
  globalThis.fetch = async (_url, init) => {
    redirect = init?.redirect;
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const result = await new ProviderHttpClient(new ProviderCircuitBreaker()).execute({ providerKey:'x', url:'https://provider.example/status', context:{requestId:'r',operation:'read',timeoutMs:1000}, maxAttempts:1, circuitBreaker:policy });
    assert.equal(result.ok, true);
    assert.equal(redirect, 'error');
  } finally {
    globalThis.fetch = original;
  }
});

test('Step 52 A6 rejects oversized provider responses before buffering', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-length': '1048577' } });
  try {
    const result = await new ProviderHttpClient(new ProviderCircuitBreaker()).execute({ providerKey:'x', url:'https://provider.example/status', context:{requestId:'r',operation:'read',timeoutMs:1000}, maxAttempts:1, circuitBreaker:policy });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.kind, 'invalid_response');
      assert.equal(result.failure.code, 'PROVIDER_RESPONSE_TOO_LARGE');
      assert.equal(result.failure.retry, 'never');
    }
  } finally {
    globalThis.fetch = original;
  }
});

test('A4 uses canonical provider failure and retry semantics', async () => {
  const source = await readFile('src/modules/integrations/infrastructure/provider-http-client.ts','utf8');
  assert.match(source,/providerFailureFromHttpStatus/);
  assert.match(source,/mayRetryProviderFailure/);
  assert.match(source,/retryAfterMs/);
  assert.match(source,/PROVIDER_CIRCUIT_OPEN/);
});

test('A4 integration module exports shared provider http client', async () => {
  const source = await readFile('src/modules/integrations/integrations.module.ts','utf8');
  assert.match(source,/ProviderCircuitBreaker/);
  assert.match(source,/ProviderHttpClient/);
  assert.match(source,/exports:\[[^\]]*ProviderConfigurationService[^\]]*ProviderHttpClient[^\]]*\]/);
});
