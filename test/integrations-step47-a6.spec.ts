import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { FxRateService } from '../src/modules/integrations/application/fx-rate.service';
import { IntegrationProviderRegistry } from '../src/modules/integrations/application/provider-registry';
import { normalizeCurrencyCode, validateFxObservation } from '../src/modules/integrations/domain/fx-provider';

test('A6 currency code normalizes and rejects malformed input', () => {
  assert.equal(normalizeCurrencyCode(' usd '), 'USD');
  assert.throws(() => normalizeCurrencyCode('USDT'), /FX_CURRENCY_CODE_INVALID/);
});

test('A6 FX observation requires positive integer Toman rate and freshness', () => {
  const now = new Date('2026-08-21T09:00:00Z');
  const value = validateFxObservation({ sourceCurrencyCode:'usd', targetUnit:'TOMAN', rateToToman:95000, observedAt:new Date('2026-08-21T08:55:00Z') }, 'USD', now, 15 * 60_000);
  assert.equal(value.sourceCurrencyCode, 'USD');
  assert.equal(value.rateToToman, 95000);
  assert.throws(() => validateFxObservation({ sourceCurrencyCode:'USD', targetUnit:'TOMAN', rateToToman:95000.5, observedAt:now }, 'USD', now), /FX_RATE_TO_TOMAN_INVALID/);
  assert.throws(() => validateFxObservation({ sourceCurrencyCode:'USD', targetUnit:'TOMAN', rateToToman:95000, observedAt:new Date('2026-08-21T08:00:00Z') }, 'USD', now), /FX_OBSERVATION_STALE/);
});

test('A6 fetch uses registered FX provider, read semantics and persists valid observation', async () => {
  const registry = new IntegrationProviderRegistry();
  let context:any = null;
  registry.register({
    key:'fx-test', kind:'fx', displayName:'FX Test',
    async health(){ return { state:'healthy' as const, checkedAt:new Date() }; },
    async fetchRate(_input:any, ctx:any){ context=ctx; return { ok:true as const, value:{ sourceCurrencyCode:'USD', targetUnit:'TOMAN' as const, rateToToman:95000, observedAt:new Date() }, providerRequestId:'req-1' }; },
  } as any);
  const recorded:any[] = [];
  const service = new FxRateService(registry, { record:async (x:any)=>{recorded.push(x);}, latest:async()=>null } as any);
  const result = await service.fetch({ providerKey:'fx-test', sourceCurrencyCode:'usd', timeoutMs:1000 });
  assert.equal(result.ok, true);
  assert.equal(context.operation, 'read');
  assert.equal(context.timeoutMs, 1000);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].observation.rateToToman, 95000);
});

test('A6 wrong provider kind fails closed and does not fabricate a rate', async () => {
  const registry = new IntegrationProviderRegistry();
  registry.register({ key:'sms-x', kind:'sms', displayName:'SMS', async health(){ return { state:'healthy' as const, checkedAt:new Date() }; } });
  const service = new FxRateService(registry, { record:async()=>{}, latest:async()=>null } as any);
  const result = await service.fetch({ providerKey:'sms-x', sourceCurrencyCode:'USD' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, 'FX_PROVIDER_KIND_MISMATCH');
});

test('A6 provider exception and invalid response are fail-closed', async () => {
  const registry = new IntegrationProviderRegistry();
  registry.register({ key:'fx-bad', kind:'fx', displayName:'Bad', async health(){ return { state:'unknown' as const, checkedAt:new Date() }; }, async fetchRate(){ throw new Error('boom'); } } as any);
  const service = new FxRateService(registry, { record:async()=>{}, latest:async()=>null } as any);
  const failed = await service.fetch({ providerKey:'fx-bad', sourceCurrencyCode:'USD' });
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.equal(failed.failure.code, 'FX_PROVIDER_UNHANDLED_FAILURE');
});

test('A6 FX observations are append-only and cannot mutate Pricing directly', async () => {
  const migration = await readFile('database/migrations/0044_integration_fx_rate_observations.sql','utf8');
  const service = await readFile('src/modules/integrations/application/fx-rate.service.ts','utf8');
  assert.match(migration,/CREATE TABLE IF NOT EXISTS integrations\.fx_rate_observations/);
  assert.match(migration,/target_unit = 'TOMAN'/);
  assert.match(migration,/BEFORE UPDATE OR DELETE/);
  assert.match(migration,/INTEGRATION_FX_RATE_OBSERVATION_IMMUTABLE/);
  assert.doesNotMatch(service,/PricingRepository|CurrencyPricingService|update.*price|insertRate/);
});

test('A6 integration module exports FX rate service for A7 composition', async () => {
  const source = await readFile('src/modules/integrations/integrations.module.ts','utf8');
  assert.match(source,/FxRateRepository/);
  assert.match(source,/FxRateService/);
  assert.match(source,/exports:\[[\s\S]*FxRateService/);
});
