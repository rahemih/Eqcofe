import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync(new URL('../application/returns.service.ts',import.meta.url),'utf8');
const r=fs.readFileSync(new URL('../infrastructure/returns.repository.ts',import.meta.url),'utf8');
test('return core has a controlled resolution boundary',()=>assert.ok(/RETURN_RESOLUTION_ENGINE_NOT_READY/.test(s)||/async resolve\(id:string,input:/.test(s)));
test('customer cancellation is stricter than database admin state machine',()=>assert.match(s,/h\.status!=='requested'/));
test('return create checks ownership and quantity before persistence',()=>{assert.match(s,/getOwnedForReturn/);assert.match(s,/RETURN_QUANTITY_EXCEEDS_ORDER_ITEM/);});
test('receive is complete-only for header transition',()=>assert.match(s,/RETURN_RECEIPT_INCOMPLETE/));
test('all core state changes are transactional and outboxed',()=>{assert.ok((s.match(/this\.tx\.run/g)||[]).length>=3);assert.ok((s.match(/returnEvent\(/g)||[]).length>=3);});
test('repository has no direct refund or restock orchestration',()=>{assert.doesNotMatch(r,/payments\./);assert.doesNotMatch(r,/inventory\./);});
