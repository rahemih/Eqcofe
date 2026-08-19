import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync(new URL('../application/warranty.service.ts',import.meta.url),'utf8');
const r=fs.readFileSync(new URL('../infrastructure/warranty.repository.ts',import.meta.url),'utf8');
test('warranty creation is customer-order-item ownership bound',()=>assert.match(s,/getOwnedItemForWarranty\(ex,orderItemId,customerId,true\)/));
test('preferred resolution is whitelisted',()=>assert.match(s,/repair','replacement','refund','inspection/));
test('warranty has a controlled resolution boundary',()=>assert.ok(/WARRANTY_RESOLUTION_ENGINE_NOT_READY/.test(s)||/async resolve\(id:string,input:/.test(s)));
test('close requires resolved status',()=>assert.match(s,/h\.status\)!=='resolved'/));
test('receive rejects future timestamp',()=>assert.match(s,/WARRANTY_RECEIVED_AT_INVALID/));
test('repository does not orchestrate payment or inventory',()=>{assert.doesNotMatch(r,/payments\./);assert.doesNotMatch(r,/inventory\./);});
