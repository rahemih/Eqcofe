import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateEnvironment } from '../src/platform/config/env.validation';
import { SchedulerTasksService } from '../apps/scheduler/scheduler-tasks.service';

test('Step 52 A9 centrally validates notification and readiness operations configuration',()=>{
  const base={DATABASE_URL:'postgres://example.invalid/eqcofe'};
  assert.throws(()=>validateEnvironment({...base,NOTIFICATION_POLL_INTERVAL_MS:'NaN'}),/NOTIFICATION_POLL_INTERVAL_MS/);
  assert.throws(()=>validateEnvironment({...base,NOTIFICATION_BATCH_SIZE:'101'}),/NOTIFICATION_BATCH_SIZE must be between 1 and 100/);
  assert.throws(()=>validateEnvironment({...base,NOTIFICATION_PROCESSING_TIMEOUT_MS:'3600001'}),/NOTIFICATION_PROCESSING_TIMEOUT_MS must be between 30000 and 3600000/);
  assert.throws(()=>validateEnvironment({...base,HEALTH_READINESS_TIMEOUT_MS:'10001'}),/HEALTH_READINESS_TIMEOUT_MS must be between 100 and 10000/);
});

test('Step 52 A9 isolates scheduler cleanup domains after an earlier failure',async()=>{
  const calls:string[]=[];
  const cart={expireCartsDue:async()=>{calls.push('cart');throw new Error('failed');},expireDue:async()=>{calls.push('checkout');}};
  const orders={expireDue:async()=>{calls.push('orders');}};
  const inventory={expireDue:async()=>{calls.push('inventory');}};
  const logs:string[]=[];
  const scheduler=new SchedulerTasksService(inventory as any,cart as any,orders as any,{} as any,{} as any,{} as any,{error:(x:string)=>logs.push(x)} as any);
  await scheduler.expireCommerceCommitments();
  assert.deepEqual(calls,['cart','checkout','orders','inventory']);
  assert.deepEqual(logs,['scheduler cleanup failed: cart-expiry']);
});

test('Step 52 A9 exposes safe event-pipeline summaries and removes no-op cron registrations',()=>{
  const outbox=readFileSync('src/platform/outbox/outbox-repository.ts','utf8');
  const worker=readFileSync('apps/worker/outbox-publisher.service.ts','utf8');
  const scheduler=readFileSync('apps/scheduler/scheduler-tasks.service.ts','utf8');
  const health=readFileSync('src/platform/health/health.controller.ts','utf8');
  assert.match(outbox,/pending_due/);assert.match(outbox,/failed_inbox/);assert.match(outbox,/oldest_due_seconds/);
  assert.match(worker,/event pipeline summary/);
  assert.doesNotMatch(scheduler,/refreshCurrencyRates|evaluateProductArchiveEligibility/);
  assert.match(health,/HEALTH_READINESS_TIMEOUT_MS/);assert.match(health,/Promise\.race/);
});
