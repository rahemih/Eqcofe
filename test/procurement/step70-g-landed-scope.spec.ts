import assert from "node:assert/strict";
import test from "node:test";
import { ReceiptCostService } from "../../src/modules/procurement/application/receipt-cost.service";
import { ScopePolicy } from "../../src/platform/auth/scope-policy";

const id=(n:number)=>`${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
type Fixture={receipt?:string|null;po?:string|null;missingReceipt?:boolean;missingPo?:boolean;allowed?:string[];candidate?:boolean;status?:string;method?:string};
function fixture(opts:Fixture={}){
  const calls:string[]=[];
  const receiptWarehouse=opts.receipt===undefined?"warehouse-a":opts.receipt;
  const poWarehouse=opts.po===undefined?null:opts.po;
  const lc={id:id(1),status:opts.status??"draft",version:1,amount_toman:100,allocation_method:opts.method??"manual",goods_receipt_id:receiptWarehouse===null?null:id(2),purchase_order_id:poWarehouse===null?null:id(3)};
  const repo={
    landedCostForUpdate:async()=>{calls.push("landed");return lc;},
    receiptForUpdate:async()=>{calls.push("receipt");return opts.missingReceipt?null:receiptWarehouse===null?null:{id:id(2),warehouse_id:receiptWarehouse};},
    purchaseOrderForUpdate:async()=>{calls.push("po");return opts.missingPo?null:poWarehouse===null?null:{id:id(3),warehouse_id:poWarehouse};},
    allocationCandidates:async()=>{calls.push("candidates");return opts.candidate===false?[]:[{id:id(4),received_quantity:1,accepted_quantity:1,quarantine_quantity:0,unit_cost_toman:100}]},
    replaceAllocations:async()=>{calls.push("write_allocations");},
    finalizeLandedCost:async()=>{calls.push("persist_final");},
  };
  const ctx={require:()=>({actor:{type:"staff",id:id(8),scopes:(opts.allowed??["warehouse:warehouse-a"])},requestId:"r",traceId:"t"})};
  const tx={run:async(fn:(trx:object)=>Promise<unknown>)=>fn({})};
  const inventory={revalueReceiptItem:async()=>{calls.push("revalue");return{inventory_revaluation_toman:100,consumed_cogs_revaluation_toman:0}}};
  const audit={writeWith:async()=>{calls.push("audit");}};
  const outbox={append:async()=>{calls.push("outbox");}};
  const service=new ReceiptCostService(tx as never,repo as never,inventory as never,audit as never,outbox as never,ctx as never,new ScopePolicy());
  const manual=[{goods_receipt_item_id:id(4),allocated_amount_toman:100}];
  return{service,calls,manual};
}

test("Step70-G B2 denies cross-warehouse preview before reading allocation candidates",async()=>{
  const f=fixture({receipt:"warehouse-b"});
  await assert.rejects(f.service.previewAllocation(id(1),f.manual),/SCOPE_FORBIDDEN/);
  assert.deepEqual(f.calls,["landed","receipt"]);
});
test("Step70-G B2 denies cross-warehouse finalize before inventory or audit side effects",async()=>{
  const f=fixture({receipt:"warehouse-b"});
  await assert.rejects(f.service.finalizeLandedCost(id(1),1,f.manual),/SCOPE_FORBIDDEN/);
  assert.deepEqual(f.calls,["landed","receipt"]);
});
test("Step70-G B2 rejects mismatched receipt and PO warehouse even for globally scoped staff",async()=>{
  const f=fixture({receipt:"warehouse-a",po:"warehouse-b",allowed:[]});
  await assert.rejects(f.service.previewAllocation(id(1),f.manual),/LANDED_COST_WAREHOUSE_MISMATCH/);
  assert.deepEqual(f.calls,["landed","receipt","po"]);
});
test("Step70-G B2 rejects missing linked warehouse without choosing a guessed fallback",async()=>{
  const f=fixture({receipt:null,po:null});
  await assert.rejects(f.service.previewAllocation(id(1),f.manual),/LANDED_COST_SCOPE_UNRESOLVED/);
  assert.deepEqual(f.calls,["landed"]);
});
test("Step70-G B2 resolves two matching warehouse links before permitted preview",async()=>{
  const f=fixture({receipt:"warehouse-a",po:"warehouse-a"});
  const response=await f.service.previewAllocation(id(1),f.manual);
  assert.deepEqual(response.allocations,f.manual);
  assert.deepEqual(f.calls,["landed","receipt","po","candidates"]);
});
test("Step70-G B2 allowed invoice-linked PO-only warehouse has permission before candidates",async()=>{
  const f=fixture({receipt:null,po:"warehouse-a"});
  const response=await f.service.previewAllocation(id(1),f.manual);
  assert.deepEqual(response.allocations,f.manual);
  assert.deepEqual(f.calls,["landed","po","candidates"]);
});

test("Step70-G B2 denies a dangling linked receipt before any allocation read",async()=>{
  const f=fixture({receipt:"warehouse-a",missingReceipt:true});
  await assert.rejects(f.service.previewAllocation(id(1),f.manual),/LANDED_COST_SCOPE_UNRESOLVED/);
  assert.deepEqual(f.calls,["landed","receipt"]);
});
test("Step70-G B2 denies a dangling linked purchase order before financial mutation",async()=>{
  const f=fixture({receipt:null,po:"warehouse-a",missingPo:true});
  await assert.rejects(f.service.finalizeLandedCost(id(1),1,f.manual),/LANDED_COST_SCOPE_UNRESOLVED/);
  assert.deepEqual(f.calls,["landed","po"]);
});
