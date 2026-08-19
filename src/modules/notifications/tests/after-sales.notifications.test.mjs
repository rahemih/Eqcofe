import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const c=fs.readFileSync(new URL('../application/after-sales-notification.consumer.ts',import.meta.url),'utf8');
const r=fs.readFileSync(new URL('../../returns/infrastructure/returns.repository.ts',import.meta.url),'utf8');
const w=fs.readFileSync(new URL('../../warranty/infrastructure/warranty.repository.ts',import.meta.url),'utf8');
const a=fs.readFileSync(new URL('../../after-sales/application/after-sales-integration.service.ts',import.meta.url),'utf8');
test('notification consumer is inbox-safe and event-id idempotent',()=>{assert.match(c,/this\.registry\.register\(this\)/);assert.match(c,/ON CONFLICT\(event_id\) DO NOTHING/);});
test('notification consumer cannot mutate return or warranty state',()=>{assert.doesNotMatch(c,/UPDATE returns\./);assert.doesNotMatch(c,/UPDATE warranty\./);});
test('timelines are derived from append-only histories',()=>{assert.match(r,/FROM returns\.status_history/);assert.match(w,/FROM warranty\.status_history/);});
test('replacement emits a dedicated event',()=>assert.match(a,/after_sales\.replacement\.requested\.v1/));
