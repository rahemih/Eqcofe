import test from 'node:test';import assert from 'node:assert/strict';
import { NotificationProviderRegistry } from '../src/modules/notifications/infrastructure/notification-provider.registry';
import { NotificationRetryPolicy } from '../src/modules/notifications/domain/notification-retry.policy';
test('provider registry has no fabricated provider by default',()=>{const r=new NotificationProviderRegistry();assert.equal(r.get('sms'),null);assert.equal(r.get('email'),null);});
test('provider registry accepts explicit test provider',()=>{const r=new NotificationProviderRegistry();r.register({key:'fake',channel:'sms',async send(){return{status:'delivered'} as const;}});assert.equal(r.get('sms')?.key,'fake');});
test('backoff is exponential and capped',()=>{const p=new NotificationRetryPolicy();assert.equal(p.backoffSeconds(1,30,300),30);assert.equal(p.backoffSeconds(2,30,300),60);assert.equal(p.backoffSeconds(10,30,300),300);});
test('provider port result supports retryable failure semantics',async()=>{const r=new NotificationProviderRegistry();r.register({key:'fake',channel:'email',async send(){return{status:'retryable_failure',errorCode:'TEMP'} as const;}});const out=await r.get('email')!.send({deliveryId:'d',channel:'email',destination:'a@b.c',subject:'s',body:'b',idempotencyKey:'d'});assert.equal(out.status,'retryable_failure');});
