import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../../../../',import.meta.url);
const order=fs.readFileSync(new URL('../../orders/application/order.service.ts',import.meta.url),'utf8');
const f=fs.readFileSync(new URL('../application/fulfillment.service.ts',import.meta.url),'utf8');
const s=fs.readFileSync(new URL('../application/shipment.service.ts',import.meta.url),'utf8');
const emitted=[...new Set([...f.matchAll(/fulfillmentEvent\('([^']+)'/g),...s.matchAll(/fulfillmentEvent\('([^']+)'/g)].map(x=>x[1]))];

test('order reads fulfillment status from fulfillment-owned projection',()=>{
  assert.match(order,/LEFT JOIN fulfillment\.fulfillments/);
  assert.doesNotMatch(order,/fulfillment_status:'unfulfilled'/);
  assert.match(order,/fulfillment_status:String\(o\.fulfillment_status\?\?'unfulfilled'\)/);
});
test('customer timeline includes fulfillment and shipment read projections',()=>{
  assert.match(order,/FROM fulfillment\.fulfillments/);
  assert.match(order,/FROM fulfillment\.shipments/);
});
test('every emitted fulfillment and shipment event has a closed JSON schema',()=>{
  assert.equal(emitted.length,8);
  for(const e of emitted){
    const p=new URL(`../../../../contracts/events/${e}.schema.json`,import.meta.url);
    const schema=JSON.parse(fs.readFileSync(p,'utf8'));
    assert.equal(schema.type,'object',e);
    assert.equal(schema.additionalProperties,false,e);
    assert.ok(Array.isArray(schema.required)&&schema.required.length>0,e);
  }
});
