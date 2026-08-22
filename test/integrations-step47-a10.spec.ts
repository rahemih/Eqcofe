import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const service=readFileSync('src/modules/integrations/application/payment-aux-provider.service.ts','utf8');
const domain=readFileSync('src/modules/integrations/domain/payment-aux-provider.ts','utf8');
const integrations=readFileSync('src/modules/integrations/integrations.module.ts','utf8');
const paymentTypes=readFileSync('src/modules/payments/domain/payment.types.ts','utf8');

test('A10 payment_aux remains separate from authoritative PaymentProvider lifecycle',()=>{assert.match(domain,/PaymentAuxObservation/);assert.match(paymentTypes,/interface PaymentProvider/);assert.doesNotMatch(service,/PaymentProvider|PaymentStatus|payment\.service|payments\/infrastructure/);});
test('A10 provider kind must be payment_aux and secrets use integration configuration boundary',()=>{assert.match(service,/kind!=='payment_aux'/);assert.match(service,/ProviderConfigurationService/);assert.doesNotMatch(service,/process\.env|ConfigService/);});
test('A10 inquiry is read-only and uses shared resilient HTTP client',()=>{assert.match(service,/operation:'read'/);assert.match(service,/method:'GET'/);assert.match(service,/ProviderHttpClient/);});
test('A10 commands are writes and require idempotency',()=>{assert.match(service,/PAYMENT_AUX_IDEMPOTENCY_REQUIRED/);assert.match(service,/operation:'write'/);assert.match(service,/idempotencyKey/);});
test('A10 output is observation-only and never marks payment paid or refunded',()=>{assert.match(domain,/accepted'\|'rejected'\|'pending'\|'unknown/);assert.doesNotMatch(domain,/paid|refunded/);assert.doesNotMatch(service,/setPayment|updatePayment|markPaid|markRefunded/);});
test('A10 provider response and timestamps fail closed',()=>{assert.match(service,/PAYMENT_AUX_PROVIDER_RESPONSE_INVALID/);assert.match(service,/Date\.now\(\)\+5\*60_000/);assert.match(service,/safeJson/);});
test('A10 paths are configuration-driven and no payment vendor is hard-coded',()=>{assert.match(service,/inquiry_path/);assert.match(service,/command_path/);assert.doesNotMatch(service,/zarinpal|nextpay|idpay|stripe|paypal/i);});
test('A10 integration module exports auxiliary payment service',()=>{assert.match(integrations,/PaymentAuxProviderService/);});
