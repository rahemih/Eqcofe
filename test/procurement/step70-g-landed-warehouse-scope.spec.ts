import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ReceiptCostService } from '../../src/modules/procurement/application/receipt-cost.service';
import { ScopePolicy } from '../../src/platform/auth/scope-policy';
import { DomainError } from '../../src/shared/errors/domain-error';

const WAREHOUSE_OK='11111111-1111-4111-8111-111111111111';
const WAREHOUSE_OTHER='22222222-2222-4222-8222-222222222222';

function fixture(warehouseId:string|null,allowed:string[]=[WAREHOUSE_OK]){
  const events:string[]=[];
  const actor={type:'staff' as const,scopes:allowed.map(id=>'warehouse:'+id),id:'33333333-3333-4333-8333-333333333333'};
  const tx={run:async<T>(fn:(trx:object)=>Promise<T>)=>fn({})};
  const repo={
    landedCostForUpdate:async()=>{events.push('locked_cost');return{id:'lc',version:2,status:'draft',warehouse_id:warehouseId,allocation_method:'quantity',amount_toman:10,allocations:[]};},
    allocationCandidates:async()=>{events.push('candidates');return[{id:'44444444-4444-4444-8444-444444444444',accepted_quantity:1,quarantine_quantity:0,unit_cost_toman:10}];},
    replaceAllocations:async()=>{events.push('write_allocations');},
    finalizeLandedCost:async()=>{events.push('finalize');},
  };
  const inventory={revalueReceiptItem:async()=>{events.push('revalue');return{inventory_revaluation_toman:6,consumed_cogs_revaluation_toman:4}}};
  const audit={writeWith:async()=>{events.push('audit');}};
  const outbox={append:async()=>{events.push('outbox');}};
  const ctx={require:()=>({actor}),get:()=>({actor})};
  const service=new ReceiptCostService(tx as never,repo as never,inventory as never,audit as never,outbox as never,ctx as never,new ScopePolicy());
  return{service,events};
}

test('70-G B2 repository locks only cost row, resolves warehouse via receipt/PO',()=>{
 const s=readFileSync('src/modules/procurement/infrastructure/procurement.repository.ts','utf8');
 const start=s.indexOf('async landedCostForUpdate(');
 const end=s.indexOf('async createLandedCost(',start);
 assert.ok(start>0&&end>start);
 const segment=s.slice(start,end);
 assert.match(segment,/COALESCE\(gr\.warehouse_id,po\.warehouse_id\) AS warehouse_id/);
 assert.match(segment,/LEFT JOIN procurement\.goods_receipts gr/);
 assert.match(segment,/LEFT JOIN procurement\.purchase_orders po/);
 assert.match(segment,/FOR UPDATE OF lc/);
 assert.doesNotMatch(segment,/FOR UPDATE\s*`/);
});

test('70-G B2 preview rejects wrong warehouse before candidates',async()=>{
 const x=fixture(WAREHOUSE_OTHER);
 await assert.rejects(x.service.previewAllocation('lc'),/SCOPE_FORBIDDEN/);
 assert.deepEqual(x.events,['locked_cost']);
});
test('70-G B2 preview refuses unresolved warehouse before candidates',async()=>{
 const x=fixture(null);
 await assert.rejects(x.service.previewAllocation('lc'),(e:unknown)=>e instanceof DomainError&&e.code==='LANDED_COST_SCOPE_UNRESOLVED');
 assert.deepEqual(x.events,['locked_cost']);
});
test('70-G B2 finalize rejects wrong warehouse before mutations',async()=>{
 const x=fixture(WAREHOUSE_OTHER);
 await assert.rejects(x.service.finalizeLandedCost('lc',2),/SCOPE_FORBIDDEN/);
 assert.deepEqual(x.events,['locked_cost']);
});
test('70-G B2 finalize refuses unresolved warehouse before mutations',async()=>{
 const x=fixture(null);
 await assert.rejects(x.service.finalizeLandedCost('lc',2),(e:unknown)=>e instanceof DomainError&&e.code==='LANDED_COST_SCOPE_UNRESOLVED');
 assert.deepEqual(x.events,['locked_cost']);
});
test('70-G B2 authorized preview computes only after scope check',async()=>{
 const x=fixture(WAREHOUSE_OK);
 const res=await x.service.previewAllocation('lc');
 assert.equal(res.landed_cost_id,'lc');
 assert.equal(res.amount_toman,10);
 assert.equal(res.allocations.length,1);
 assert.deepEqual(x.events,['locked_cost','candidates']);
});

test('70-G B2 authorized finalize proceeds through allocations, inventory, audit and outbox',async()=>{
 const x=fixture(WAREHOUSE_OK);
 const res=await x.service.finalizeLandedCost('lc',2);
 assert.equal(res.status,'finalized');
 assert.equal(res.inventory_revaluation_toman,6);
 assert.equal(res.consumed_cogs_revaluation_toman,4);
 assert.equal(res.allocations.length,1);
 assert.deepEqual(x.events,['locked_cost','candidates','write_allocations','revalue','finalize','audit','outbox']);
});
