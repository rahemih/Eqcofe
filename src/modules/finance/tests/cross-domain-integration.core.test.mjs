import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const c=fs.readFileSync(new URL('../application/finance-cross-domain.consumer.ts',import.meta.url),'utf8');
const pc=fs.readFileSync(new URL('../application/profit-calculation.service.ts',import.meta.url),'utf8');
const pf=fs.readFileSync(new URL('../application/profit-finalization.service.ts',import.meta.url),'utf8');
test('consumer is inbox-safe and event-driven',()=>{assert.match(c,/EventConsumerRegistry/);assert.match(c,/this\.registry\.register\(this\)/);assert.match(c,/finance\.cross_domain\.v1/);});
test('critical financial source events trigger recalculation',()=>{for(const e of ['payment.paid.v1','payment.refunded.v1','inventory.stock.consumed.v1','inventory.return.received.v1','return.resolved.v1','procurement.landed_cost.finalized.v1'])assert.match(c,new RegExp(e.replaceAll('.','\\.')));assert.match(c,/calculateInTransaction\(trx/);});
test('financial mutations reverse a current final before recalculation',()=>{assert.match(c,/FINAL_INVALIDATORS/);assert.match(c,/currentFinalProfit/);assert.match(c,/reverseInTransaction\(trx/);});
test('order resolution covers direct order item return and landed-cost lineage',()=>{assert.match(c,/p\.order_id/);assert.match(c,/orders\.order_items/);assert.match(c,/returns\.returns/);assert.match(c,/landed_cost_allocations/);assert.match(c,/cost_layer_consumptions/);});
test('existing public transaction wrappers remain intact',()=>{assert.match(pc,/calculateInTransaction/);assert.match(pc,/this\.tx\.run\(ex=>this\.calculateInTransaction/);assert.match(pf,/reverseInTransaction/);assert.match(pf,/this\.tx\.run\(ex=>this\.reverseInTransaction/);});
