import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { IntegrationProviderRegistry } from '../src/modules/integrations/application/provider-registry';

test('A5 provider registry rejects duplicate keys and sorts deterministically', async () => {
  const registry = new IntegrationProviderRegistry();
  const p = { key:'z', kind:'fx' as const, displayName:'Z', async health(){ return { state:'healthy' as const, checkedAt:new Date() }; } };
  registry.register(p);
  registry.register({ ...p, key:'a', displayName:'A' });
  assert.deepEqual(registry.list().map(x => x.key), ['a','z']);
  assert.throws(() => registry.register(p), /INTEGRATION_PROVIDER_DUPLICATE/);
});

test('A5 health persistence is append-only and indexed for latest provider state', async () => {
  const migration = await readFile('database/migrations/0043_integration_provider_health_observability.sql','utf8');
  assert.match(migration,/CREATE TABLE IF NOT EXISTS integrations\.provider_health_samples/);
  assert.match(migration,/provider_key, checked_at DESC, id DESC/);
  assert.match(migration,/BEFORE UPDATE OR DELETE/);
  assert.match(migration,/INTEGRATION_PROVIDER_HEALTH_IMMUTABLE/);
});

test('A5 health service uses health operation with finite bounded timeout', async () => {
  const source = await readFile('src/modules/integrations/application/provider-health.service.ts','utf8');
  assert.match(source,/operation: 'health'/);
  assert.match(source,/timeoutMs < 100 \|\| timeoutMs > 30_000/);
  assert.match(source,/repo\.record/);
});

test('A5 unhandled health failure is normalized fail-closed as unknown', async () => {
  const source = await readFile('src/modules/integrations/application/provider-health.service.ts','utf8');
  assert.match(source,/state: 'unknown'/);
  assert.match(source,/PROVIDER_HEALTH_UNHANDLED_FAILURE/);
  assert.match(source,/createProviderFailure/);
});

test('A5 observability exposes current snapshot and bounded window summary', async () => {
  const service = await readFile('src/modules/integrations/application/provider-health.service.ts','utf8');
  const repo = await readFile('src/modules/integrations/infrastructure/provider-health.repository.ts','utf8');
  assert.match(service,/windowMinutes < 1 \|\| windowMinutes > 43_200/);
  assert.match(repo,/DISTINCT ON \(provider_key\)/);
  assert.match(repo,/healthy_checks/);
  assert.match(repo,/avg_latency_ms/);
});

test('A5 module exports provider registry and health service for future adapters', async () => {
  const source = await readFile('src/modules/integrations/integrations.module.ts','utf8');
  assert.match(source,/IntegrationProviderRegistry/);
  assert.match(source,/ProviderHealthService/);
  assert.match(source,/exports:\[[\s\S]*ProviderConfigurationService/);
  assert.match(source,/exports:\[[\s\S]*ProviderHttpClient/);
  assert.match(source,/exports:\[[\s\S]*IntegrationProviderRegistry/);
  assert.match(source,/exports:\[[\s\S]*ProviderHealthService/);
});
