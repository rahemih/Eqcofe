import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shipping=readFileSync('src/modules/integrations/application/shipping-provider.service.ts','utf8');
const fulfillmentModule=readFileSync('src/modules/fulfillment/fulfillment.module.ts','utf8');
const registry=readFileSync('src/modules/fulfillment/application/ports/shipping-provider.registry.ts','utf8');
const legacy=readFileSync('src/modules/fulfillment/infrastructure/configured-shipping.provider.ts','utf8');
const shipment=readFileSync('src/modules/fulfillment/application/shipment.service.ts','utf8');

test('A9 shipping transport belongs to Integrations and uses shared resilient HTTP client',()=>{assert.match(shipping,/ProviderHttpClient/);assert.match(shipping,/ProviderConfigurationService/);assert.doesNotMatch(shipping,/process\.env/);});
test('A9 Fulfillment imports Integrations and keeps ShipmentService authoritative',()=>{assert.match(fulfillmentModule,/IntegrationsModule/);assert.match(fulfillmentModule,/ShipmentService/);assert.match(shipment,/applyTrackingInTransaction/);});
test('A9 existing shipping port remains canonical and registry resolves through adapter factory',()=>{assert.match(registry,/IntegrationShippingProviderAdapterFactory/);assert.doesNotMatch(registry,/ConfigService/);});
test('A9 legacy configured provider no longer performs direct fetch or reads shipping secrets',()=>{assert.doesNotMatch(legacy,/fetch\(/);assert.doesNotMatch(legacy,/SHIPPING_PROVIDER_API_TOKEN|SHIPPING_WEBHOOK_HMAC_SECRET/);assert.match(legacy,/ShippingProviderService/);});
test('A9 refresh is read-only provider transport with finite configured timeout',()=>{assert.match(shipping,/operation:'read'/);assert.match(shipping,/timeoutMs:configuration\.timeoutMs/);assert.match(shipping,/retryMaxAttempts/);});
test('A9 webhook verification is fail-closed with HMAC and timestamp skew',()=>{assert.match(shipping,/createHmac\('sha256',secret\)/);assert.match(shipping,/timingSafeEqual/);assert.match(shipping,/SHIPPING_WEBHOOK_TIMESTAMP_INVALID/);});
test('A9 provider responses normalize shipping states without mutating shipment lifecycle directly',()=>{assert.match(shipping,/normalizedStatus/);assert.doesNotMatch(shipping,/setShipmentState|insertTrackingEvent|FulfillmentRepository/);});
test('A9 no shipping vendor is hard-coded',()=>{assert.doesNotMatch(shipping,/postex|tipax|chapar|dhl|fedex|ups/i);});
