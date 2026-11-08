import assert from "node:assert/strict";
import test from "node:test";
import { ReceiptCostService } from "../../src/modules/procurement/application/receipt-cost.service";
import { ScopePolicy } from "../../src/platform/auth/scope-policy";

const id=(n:number)=>[String(n).repeat(8),String(n).repeat(4),"4"+String(n).repeat(3),"8"+String(n).repeat(3),String(n).repeat(12)].join("-");
type Setup={poWarehouse?:string;poMissing?:boolean;poSupplier?:string;receiptLinkedPo?:boolean;allowed?:string[]};
function fixture(opts:Setup={}){
 const calls:string[]=[];let created:Record<string,unknown>|null=null;
 const actor={type:"staff" as const,id:id(8),scopes:opts.allowed??["warehouse:warehouse-a"]};
 const repo={
  receiptForUpdate:async()=>{calls.push("receipt");return{id:id(2),status:"posted",warehouse_id:"warehouse-a",supplier_id:id(6),purchase_order_id:opts.receiptLinkedPo?id(3):null};},
  purchaseOrderForUpdate:async()=>{calls.push("po");return opts.poMissing?null:{id:id(3),warehouse_id:opts.poWarehouse??"warehouse-a",supplier_id:opts.poSupplier??id(6)};},
  nextNumber:async()=>{calls.push("number");return"LC-TEST";},
  createLandedCost:async(_trx:unknown,i:Record<string,unknown>)=>{calls.push("create");created=i;},
  landedCost:async()=>{calls.push("read");return{id:id(1),warehouse_id:"warehouse-a",allocations:[]};},
 };
 const tx={run:async<T>(fn:(trx:object)=>Promise<T>)=>fn({})};
 const ctx={require:()=>({actor,requestId:"req",traceId:"trace"}),get:()=>({actor})};
 const audit={writeWith:async()=>{calls.push("audit");}};
 const service=new ReceiptCostService(tx as never,repo as never,{} as never,audit as never,{} as never,ctx as never,new ScopePolicy());
 const input={goods_receipt_id:id(2),purchase_order_id:id(3),cost_type:"shipping",amount_toman:100};
 return {service,calls,input,getCreated:()=>created};
}

test("70-G B2C denies standalone receipt A to unauthorized PO B",async()=>{
 const f=fixture({poWarehouse:"warehouse-b"});
 await assert.rejects(f.service.createLandedCost(f.input),/SCOPE_FORBIDDEN/);
 assert.deepEqual(f.calls,["receipt","po"]);
 assert.equal(f.getCreated(),null);
});
test("70-G B2C globally scoped actor denies different PO warehouse",async()=>{
 const f=fixture({poWarehouse:"warehouse-b",allowed:[]});
 await assert.rejects(f.service.createLandedCost(f.input),{code:"LANDED_COST_WAREHOUSE_MISMATCH"});
 assert.deepEqual(f.calls,["receipt","po"]);
});
test("70-G B2C rejects missing explicitly linked PO before writes",async()=>{
 const f=fixture({poMissing:true});
 await assert.rejects(f.service.createLandedCost(f.input),{code:"PURCHASE_ORDER_NOT_FOUND"});
 assert.deepEqual(f.calls,["receipt","po"]);
});
test("70-G B2C rejects mismatched PO supplier before writes",async()=>{
 const f=fixture({poSupplier:id(7)});
 await assert.rejects(f.service.createLandedCost(f.input),{code:"LANDED_COST_SUPPLIER_MISMATCH"});
 assert.deepEqual(f.calls,["receipt","po"]);
});
test("70-G B2C permits valid receipt and explicit PO in same warehouse",async()=>{
 const f=fixture();
 const result=await f.service.createLandedCost(f.input);
 assert.equal(result.id,id(1));
 assert.deepEqual(f.calls,["receipt","po","number","create" ,"read"]);
 assert.equal(f.getCreated()?.poId,id(3));
});
test("70-G B2C revalidates PO inherited from receipt",async()=>{
 const f=fixture({receiptLinkedPo:true});
 const result=await f.service.createLandedCost({goods_receipt_id:id(2),cost_type:"shipping",amount_toman:100});
 assert.equal(result.id,id(1));
 assert.deepEqual(f.calls,["receipt","po","number","create" ,"read"]);
 assert.equal(f.getCreated()?.poId,id(3));
});
test("70-G B2C preserves receipt-only creation",async()=>{
 const f=fixture();
 const result=await f.service.createLandedCost({goods_receipt_id:id(2),cost_type:"shipping",amount_toman:100});
 assert.equal(result.id,id(1));
 assert.deepEqual(f.calls,["receipt","number","create" ,"read"]);
 assert.equal(f.getCreated()?.poId,undefined);
});
test("70-G B2C preserves PO-only creation",async()=>{
 const f=fixture();
 const result=await f.service.createLandedCost({purchase_order_id:id(3),cost_type:"shipping",amount_toman:100});
 assert.equal(result.id,id(1));
 assert.deepEqual(f.calls,["po","number","create" ,"read"]);
});
