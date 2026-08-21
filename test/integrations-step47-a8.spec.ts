import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NotificationChannelAdapterFactory } from '../src/modules/integrations/application/notification-channel-adapter.factory';

const source=readFileSync('src/modules/integrations/application/notification-channel-adapter.factory.ts','utf8');
const notifications=readFileSync('src/modules/notifications/application/notification-delivery.service.ts','utf8');
const moduleSource=readFileSync('src/modules/integrations/integrations.module.ts','utf8');

test('A8 adapter supports only existing sms/email notification channels',()=>{assert.match(source,/OutboundNotificationChannel/);assert.doesNotMatch(source,/whatsapp|telegram/);});
test('A8 provider selection remains configuration-driven and no vendor is hard-coded',()=>{assert.match(source,/ProviderConfigurationService/);assert.doesNotMatch(source,/kavenegar|melipayamak|twilio|sendgrid|mailgun|resend/i);});
test('A8 outbound writes carry delivery idempotency into shared resilient HTTP client',()=>{assert.match(source,/operation:'write'/);assert.match(source,/idempotencyKey:message\.idempotencyKey/);assert.match(source,/ProviderHttpClient/);});
test('A8 secrets are resolved by integration configuration boundary and not persisted in notifications',()=>{assert.match(source,/configurations\.require/);assert.match(source,/NOTIFICATION_PROVIDER_SECRET_REQUIRED/);assert.doesNotMatch(notifications,/secretRef|process\.env/);});
test('A8 maps provider failures into notification retry/permanent semantics',()=>{assert.match(source,/retryable_failure/);assert.match(source,/permanent_failure/);assert.match(source,/authentication/);assert.match(source,/authorization/);});
test('A8 keeps Notifications authoritative for delivery lifecycle',()=>{assert.match(notifications,/providers\.get\(channel\)/);assert.match(notifications,/provider\.send/);assert.match(notifications,/finishAttempt/);});
test('A8 integration module exports adapter factory without importing NotificationsModule',()=>{assert.match(moduleSource,/NotificationChannelAdapterFactory/);assert.doesNotMatch(moduleSource,/NotificationsModule/);});

test('A8 runtime adapter fails closed on channel mismatch before configuration lookup',async()=>{let called=false;const factory=new NotificationChannelAdapterFactory({require:async()=>{called=true;throw new Error('unexpected');}} as any,{} as any);const adapter=factory.create('sms-primary','sms');const result=await adapter.send({deliveryId:'d1',channel:'email',destination:'x',subject:null,body:'b',idempotencyKey:'d1'} as any);assert.equal(result.status,'permanent_failure');assert.equal(called,false);});
