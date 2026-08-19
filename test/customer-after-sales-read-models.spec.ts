import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OrderCustomerReadService } from '../src/modules/orders/application/ports/order-customer-read.service';
import { ReturnCustomerReadService } from '../src/modules/returns/application/ports/return-customer-read.service';
import { WarrantyCustomerReadService } from '../src/modules/warranty/application/ports/warranty-customer-read.service';

test('order customer read port delegates only to Orders-owned customer queries',async()=>{
  const calls:string[]=[];const owner:any={
    listCustomer:async(c:any,l:any)=>{calls.push(`list:${c}:${l}`);return{items:[]};},
    getCustomer:async(n:string)=>{calls.push(`get:${n}`);return{order_number:n};},
    timelineCustomer:async(n:string)=>{calls.push(`timeline:${n}`);return{order_number:n,timeline:[]};},
    invoiceCustomer:async(n:string)=>{calls.push(`invoice:${n}`);return{invoice_number:n};},
  };
  const read=new OrderCustomerReadService(owner);
  await read.list('c',10);await read.get('EQ-1');await read.timeline('EQ-1');await read.invoice('EQ-1');
  assert.deepEqual(calls,['list:c:10','get:EQ-1','timeline:EQ-1','invoice:EQ-1']);
});

test('return customer read port delegates only to Returns-owned customer queries',async()=>{
  const calls:string[]=[];const owner:any={listCustomer:async()=>{calls.push('list');return[];},getCustomer:async(n:string)=>{calls.push(`get:${n}`);return{};},timelineCustomer:async(n:string)=>{calls.push(`timeline:${n}`);return{};}};
  const read=new ReturnCustomerReadService(owner);await read.list();await read.get('RET-1');await read.timeline('RET-1');
  assert.deepEqual(calls,['list','get:RET-1','timeline:RET-1']);
});

test('warranty customer read port delegates only to Warranty-owned customer queries',async()=>{
  const calls:string[]=[];const owner:any={listCustomer:async()=>{calls.push('list');return[];},getCustomer:async(n:string)=>{calls.push(`get:${n}`);return{};},timelineCustomer:async(n:string)=>{calls.push(`timeline:${n}`);return{};}};
  const read=new WarrantyCustomerReadService(owner);await read.list();await read.get('WAR-1');await read.timeline('WAR-1');
  assert.deepEqual(calls,['list','get:WAR-1','timeline:WAR-1']);
});

test('customer-facing read routes consume public read ports while mutations remain owner services',()=>{
  const o=fs.readFileSync('src/modules/orders/presentation/orders.controller.ts','utf8');
  const r=fs.readFileSync('src/modules/returns/presentation/returns.controller.ts','utf8');
  const w=fs.readFileSync('src/modules/warranty/presentation/warranty.controller.ts','utf8');
  assert.match(o,/ORDER_CUSTOMER_READ_PORT/);assert.match(o,/customerRead\.list/);assert.match(o,/customerRead\.invoice/);assert.match(o,/svc\.cancelCustomer/);
  assert.match(r,/RETURN_CUSTOMER_READ_PORT/);assert.match(r,/customerRead\.list/);assert.match(r,/returns\.createCustomer/);assert.match(r,/returns\.cancelCustomer/);
  assert.match(w,/WARRANTY_CUSTOMER_READ_PORT/);assert.match(w,/customerRead\.list/);assert.match(w,/warranty\.createCustomer/);
});

test('Customer domain does not import or query Orders Returns Warranty persistence',()=>{
  const files=['src/modules/customer/customer.module.ts','src/modules/customer/application/customer-profile.service.ts','src/modules/customer/application/customer-address.service.ts','src/modules/customer/application/customer-wishlist.service.ts','src/modules/customer/application/customer-wholesale.service.ts','src/modules/customer/infrastructure/customer.repository.ts','src/modules/customer/infrastructure/customer-wholesale.repository.ts'];
  const text=files.map(f=>fs.readFileSync(f,'utf8')).join('\n').toLowerCase();
  for(const forbidden of ['orders.orders','returns.returns','warranty.warranty','../orders','../returns','../warranty'])assert.equal(text.includes(forbidden),false,forbidden);
});

test('A10 adds no database migration and keeps existing customer read HTTP contracts',()=>{
  assert.equal(fs.existsSync('database/migrations/0028_customer_read_models.sql'),false);
  const api=fs.readFileSync('contracts/http/openapi.yaml','utf8');
  for(const route of ['/customer/orders:','/customer/returns:','/customer/warranty/claims:'])assert.ok(api.includes(route),route);
});
