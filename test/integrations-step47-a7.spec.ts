import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { FxCurrencyPreviewService } from '../src/modules/pricing/application/fx-currency-preview.service';

function service(overrides: Partial<any> = {}) {
  const fx = overrides.fx ?? { async fetch(){ return { ok:true as const, value:{ sourceCurrencyCode:'USD', targetUnit:'TOMAN' as const, rateToToman:60000, observedAt:new Date(), sourceReference:'ref' }, providerRequestId:'req-1' }; } };
  const currency = overrides.currency ?? { async register(){ return { currency_rate_id:'rate-1', source_currency_code:'USD', rate_to_toman:60000, status:'validated', deviation_percent:1 }; } };
  const impact = overrides.impact ?? { async preview(i:any){ return { preview_id:'preview-1', rate_to_toman:60000, affected_count:2, warnings:[], items:[], expires_at:new Date(), input:i }; } };
  return { svc:new FxCurrencyPreviewService(fx as any,currency as any,impact as any), fx, currency, impact };
}

test('A7 fetches observation, registers rate, and returns mandatory preview without apply', async () => {
  const { svc } = service();
  const result = await svc.refreshPreview({ provider_key:'fx-main', source_currency_code:'usd', scope_type:'all' });
  assert.equal(result.observation.rate_to_toman,60000);
  assert.equal(result.currency_rate.status,'validated');
  assert.equal(result.preview.preview_id,'preview-1');
  assert.equal(result.apply_required,true);
});

test('A7 provider failure is fail-closed before Pricing registration', async () => {
  let registered = false;
  const { svc } = service({
    fx:{ async fetch(){ return { ok:false as const, failure:{ kind:'timeout', code:'PROVIDER_TIMEOUT', message:'timeout', retry:'safe', retryAfterMs:null, providerRequestId:null } }; } },
    currency:{ async register(){ registered=true; } },
  });
  await assert.rejects(() => svc.refreshPreview({ provider_key:'fx-main', scope_type:'all' }), /دریافت نرخ ارز/);
  assert.equal(registered,false);
});

test('A7 suspicious rate is registered for review but cannot create impact preview', async () => {
  let previewed = false;
  const { svc } = service({
    currency:{ async register(){ return { currency_rate_id:'rate-2', status:'suspicious', deviation_percent:25 }; } },
    impact:{ async preview(){ previewed=true; } },
  });
  await assert.rejects(() => svc.refreshPreview({ provider_key:'fx-main', scope_type:'all' }), /نیازمند بررسی مدیر/);
  assert.equal(previewed,false);
});

test('A7 scoped preview requires identifiers and rejects unsupported scope', async () => {
  const { svc } = service();
  await assert.rejects(() => svc.refreshPreview({ provider_key:'fx-main', scope_type:'product', scope_ids:[] }), /حداقل یک شناسه/);
  await assert.rejects(() => svc.refreshPreview({ provider_key:'fx-main', scope_type:'warehouse' as any }), /دامنه پیش‌نمایش/);
});

test('A7 refresh endpoint delegates to preview orchestrator while apply stays separate and protected', async () => {
  const source = await readFile('src/modules/pricing/presentation/pricing.controller.ts','utf8');
  assert.match(source,/currency-rates\/refresh'[\s\S]{0,120}fxPreview\.refreshPreview\(b\)/);
  assert.match(source,/@RequireStepUp\(\) @RequireIdempotency\('pricing\.currency\.apply'\) @Post\('admin\/pricing\/currency\/apply'\)/);
  assert.doesNotMatch(source,/currency-rates\/refresh'[\s\S]{0,160}currencyImpact\.apply/);
});

test('A7 Pricing imports Integrations but Integrations does not import Pricing', async () => {
  const pricing = await readFile('src/modules/pricing/pricing.module.ts','utf8');
  const integrations = await readFile('src/modules/integrations/integrations.module.ts','utf8');
  assert.match(pricing,/IntegrationsModule/);
  assert.doesNotMatch(integrations,/PricingModule|modules\/pricing/);
});

test('A7 keeps raw FX transport out of Pricing and preserves existing profit guard preview path', async () => {
  const bridge = await readFile('src/modules/pricing/application/fx-currency-preview.service.ts','utf8');
  const impact = await readFile('src/modules/pricing/application/currency-impact.service.ts','utf8');
  assert.match(bridge,/this\.fx\.fetch/);
  assert.match(bridge,/this\.impact\.preview/);
  assert.doesNotMatch(bridge,/ProviderHttpClient|insertBasePrice|closeBasePriceAt|https?:\/\//);
  assert.match(impact,/this\.guard\.evaluate/);
});
