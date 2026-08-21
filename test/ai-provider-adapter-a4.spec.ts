import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration=readFileSync('database/migrations/0046_integration_ai_provider_kind.sql','utf8');
const adapter=readFileSync('src/modules/ai/infrastructure/configured-ai-provider.adapter.ts','utf8');
const aiModule=readFileSync('src/modules/ai/ai.module.ts','utf8');
const integrationContracts=readFileSync('src/modules/integrations/domain/provider-contracts.ts','utf8');
const secretResolver=readFileSync('src/modules/integrations/infrastructure/environment-secret.resolver.ts','utf8');
const httpClient=readFileSync('src/modules/integrations/infrastructure/provider-http-client.ts','utf8');

test('A4 adds AI as an additive integration provider kind',()=>{
  assert.match(integrationContracts,/payment_aux' \| 'ai'/);
  assert.match(migration,/provider_kind IN \('fx','sms','email','shipping','payment_aux','ai'\)/);
  assert.doesNotMatch(migration,/DROP TABLE/i);
});

test('A4 reuses integrations configuration secret and resilient HTTP boundaries',()=>{
  assert.match(adapter,/ProviderConfigurationService/);
  assert.match(adapter,/ProviderHttpClient/);
  assert.match(aiModule,/imports: \[IntegrationsModule\]/);
  assert.match(secretResolver,/EQCOFE_\[A-Z0-9_\]/);
  assert.match(httpClient,/AbortController/);
  assert.match(httpClient,/circuitBreaker/);
});

test('A4 keeps provider secrets environment-owned and out of AI persistence',()=>{
  assert.match(adapter,/loaded\.secret/);
  assert.doesNotMatch(migration,/secret_value|access_token|refresh_token|api_key/i);
  assert.doesNotMatch(adapter,/process\.env|ConfigService/);
});

test('A4 adapter fails closed on provider-kind and response-shape mismatch',()=>{
  assert.match(adapter,/AI_PROVIDER_KIND_MISMATCH/);
  assert.match(adapter,/AI_PROVIDER_INVALID_JSON/);
  assert.match(adapter,/AI_PROVIDER_RESPONSE_INVALID/);
});

test('A4 outbound generation is bounded and retry-safe at integration boundary',()=>{
  assert.match(adapter,/operation: 'write'/);
  assert.match(adapter,/idempotencyKey: request\.context\.requestId/);
  assert.match(adapter,/Math\.min\(request\.context\.timeoutMs, loaded\.configuration\.timeoutMs\)/);
  assert.match(adapter,/retryMaxAttempts \+ 1/);
});

test('A4 introduces no AI HTTP API or commerce mutation authority',()=>{
  const combined=adapter+'\n'+aiModule+'\n'+migration;
  assert.doesNotMatch(combined,/Controller\(|@Post\(|@Patch\(|@Delete\(/);
  assert.doesNotMatch(combined,/pricing\.|inventory\.|orders\.|payments\.|finance\./i);
});
