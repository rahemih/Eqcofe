import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ProviderCircuitBreaker } from '../src/modules/integrations/infrastructure/provider-circuit-breaker';
import { NotificationChannelAdapterFactory } from '../src/modules/integrations/application/notification-channel-adapter.factory';
import { PaymentAuxProviderService } from '../src/modules/integrations/application/payment-aux-provider.service';

const read=(p:string)=>readFileSync(p,'utf8');

test('A11 secret boundary is preserved across integration runtime',()=>{
  for(const p of [
    'src/modules/integrations/application/notification-channel-adapter.factory.ts',
    'src/modules/integrations/application/shipping-provider.service.ts',
    'src/modules/integrations/application/payment-aux-provider.service.ts',
  ]){
    const s=read(p);
    assert.match(s,/ProviderConfigurationService/);
    assert.doesNotMatch(s,/process\.env/);
  }
});

test('A11 all provider writes remain idempotent and bounded',()=>{
  const notification=read('src/modules/integrations/application/notification-channel-adapter.factory.ts');
  const payment=read('src/modules/integrations/application/payment-aux-provider.service.ts');
  assert.match(notification,/operation:'write'/);
  assert.match(notification,/idempotencyKey:message\.idempotencyKey/);
  assert.match(payment,/operation:'write'/);
  assert.match(payment,/PAYMENT_AUX_IDEMPOTENCY_REQUIRED/);
});

test('A11 provider HTTP transport enforces https finite timeout bounded retry and circuit breaker',()=>{
  const s=read('src/modules/integrations/infrastructure/provider-http-client.ts');
  assert.match(s,/PROVIDER_HTTP_INSECURE_URL/);
  assert.match(s,/PROVIDER_TIMEOUT_INVALID/);
  assert.match(s,/PROVIDER_MAX_ATTEMPTS_INVALID/);
  assert.match(s,/PROVIDER_CIRCUIT_OPEN/);
  assert.match(s,/mayRetryProviderFailure/);
});

test('A11 circuit breaker behaves deterministically under repeated failures',()=>{
  const b=new ProviderCircuitBreaker();
  const p={failureThreshold:2,openMs:1000,halfOpenMaxCalls:1};
  b.recordFailure('p',p,0);b.recordFailure('p',p,10);
  assert.equal(b.canExecute('p',p,100),false);
  assert.equal(b.canExecute('p',p,1010),true);
  assert.equal(b.canExecute('p',p,1011),false);
  b.recordSuccess('p');
  assert.equal(b.canExecute('p',p,1012),true);
});

test('A11 notification adapter fails closed before provider call on channel mismatch',async()=>{
  let configCalled=false;
  const factory=new NotificationChannelAdapterFactory({require:async()=>{configCalled=true;throw new Error('unexpected');}} as any,{} as any);
  const adapter=factory.create('sms-primary','sms');
  const result=await adapter.send({deliveryId:'d',channel:'email',destination:'x',subject:null,body:'x',idempotencyKey:'d'} as any);
  assert.equal(result.status,'permanent_failure');
  assert.equal(configCalled,false);
});

test('A11 notification delivery lifecycle remains owned by Notifications',()=>{
  const s=read('src/modules/notifications/application/notification-delivery.service.ts');
  assert.match(s,/providers\.get\(channel\)/);
  assert.match(s,/provider\.send/);
  assert.match(s,/finishAttempt/);
  assert.doesNotMatch(read('src/modules/integrations/integrations.module.ts'),/NotificationsModule/);
});

test('A11 shipping integration normalizes observations but cannot own shipment state',()=>{
  const integration=read('src/modules/integrations/application/shipping-provider.service.ts');
  const fulfillment=read('src/modules/fulfillment/application/shipment.service.ts');
  assert.match(integration,/ProviderHttpClient/);
  assert.doesNotMatch(integration,/UPDATE\s+fulfillment|shipment_status\s*=/i);
  assert.match(fulfillment,/Shipment/);
});

test('A11 payment_aux can never authoritatively mark paid or refunded',()=>{
  const domain=read('src/modules/integrations/domain/payment-aux-provider.ts');
  const service=read('src/modules/integrations/application/payment-aux-provider.service.ts');
  assert.match(domain,/accepted/);assert.match(domain,/pending/);assert.match(domain,/unknown/);
  assert.doesNotMatch(domain,/\bpaid\b|\brefunded\b/);
  assert.doesNotMatch(service,/PaymentStatus|payment_status|UPDATE\s+payments/i);
});

test('A11 Payments remains authoritative for core provider lifecycle',()=>{
  const paymentTypes=read('src/modules/payments/domain/payment.types.ts');
  assert.match(paymentTypes,/initiate\(/);
  assert.match(paymentTypes,/verify\(/);
  assert.match(paymentTypes,/reconcile\(/);
  assert.match(paymentTypes,/refund\(/);
  assert.match(paymentTypes,/parseWebhook\(/);
});

test('A11 FX remains observation plus mandatory preview before apply',()=>{
  const preview=read('src/modules/pricing/application/fx-currency-preview.service.ts');
  const controller=read('src/modules/pricing/presentation/pricing.controller.ts');
  assert.match(preview,/FxRateService/);
  assert.match(preview,/preview/);
  assert.match(controller,/currency-rates\/refresh/);
  assert.match(controller,/currency\/apply/);
  assert.match(controller,/RequireStepUp/);
  assert.match(controller,/RequireIdempotency/);
});

test('A11 provider health remains independent and append-only',()=>{
  const migration=read('database/migrations/0043_integration_provider_health_observability.sql');
  const service=read('src/modules/integrations/application/provider-health.service.ts');
  assert.match(migration,/UPDATE|DELETE/);
  assert.match(service,/operation:\s*'health'/);
});

test('A11 Step-47 migration lineage is additive and ordered',()=>{
  const names=readdirSync('database/migrations');
  for(const n of [42,43,44])assert.equal(names.some(x=>x.startsWith(String(n).padStart(4,'0')+'_')),true,`missing ${n}`);
});

test('A11 integration module exports all Step-47 runtime surfaces',()=>{
  const s=read('src/modules/integrations/integrations.module.ts');
  for(const token of ['ProviderConfigurationService','ProviderHttpClient','IntegrationProviderRegistry','ProviderHealthService','FxRateService','NotificationChannelAdapterFactory','ShippingProviderService','PaymentAuxProviderService']) assert.match(s,new RegExp(token));
});

test('A11 no provider vendor is hard-coded in generic integration services',()=>{
  const files=[
    'src/modules/integrations/application/notification-channel-adapter.factory.ts',
    'src/modules/integrations/application/shipping-provider.service.ts',
    'src/modules/integrations/application/payment-aux-provider.service.ts',
    'src/modules/integrations/application/fx-rate.service.ts',
  ];
  const s=files.map(read).join('\n');
  assert.doesNotMatch(s,/kavenegar|melipayamak|twilio|sendgrid|mailgun|resend|zarinpal|nextpay|idpay|stripe|paypal/i);
});

test('A11 all A2-A10 Step-47 regression suites remain present',()=>{
  const names=readdirSync('test');
  for(let n=2;n<=10;n++) assert.equal(names.some(x=>x.includes(`step47-a${n}`)),true,`missing A${n} regression`);
});
