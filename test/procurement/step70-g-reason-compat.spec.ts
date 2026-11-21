import test from "node:test";
import assert from "node:assert/strict";
import { ProcurementController } from "../../src/modules/procurement/presentation/procurement.controller";

function controller() {
  const calls: Array<{method:string;args:unknown[]}>=[];
  const receipts={
    transitionReceipt:(...args:unknown[])=>{calls.push({method:"receipt",args});return{id:"receipt"};},
    transitionInvoice:(...args:unknown[])=>{calls.push({method:"invoice",args});return{id:"invoice"};},
  };
  return{ctrl:new ProcurementController({} as never,{} as never,receipts as never,{} as never),calls};
}

test("70-G B1 receipt reverse honors canonical comment and parses If-Match",()=>{
  const{ctrl,calls}=controller();
  ctrl.reverseReceipt("11111111-1111-4111-8111-111111111111",'"4"',{
    comment:"با تأیید مالک انبار",reason:"legacy",note:"fallback",
  });
  assert.deepEqual(calls,[{method:"receipt",args:["11111111-1111-4111-8111-111111111111","reversed",4,"با تأیید مالک انبار"]}]);
});
test("70-G B1 receipt reverse retains legacy fallback, no invented default reason",()=>{
  const a=controller();
  a.ctrl.reverseReceipt("id",'"2"',{reason:"legacy"});
  a.ctrl.reverseReceipt("id",'"3"',{note:"note"});
  a.ctrl.reverseReceipt("id",'"4"',{});
  assert.deepEqual(a.calls.map(x=>x.args[3]),["legacy","note",undefined]);
});
test("70-G B1 invoice dispute and cancel consume canonical resolution_note",()=>{
  const a=controller();
  a.ctrl.disputeInvoice("inv",'"6"',{resolution_note:"مغایرت مبلغ خرید",reason:"legacy"});
  a.ctrl.cancelInvoice("inv",'"7"',{resolution_note:"فاکتور تکراری",note:"legacy"});
  assert.deepEqual(a.calls.map(x=>x.args),[
    ["inv","disputed",6,"مغایرت مبلغ خرید"],
    ["inv","cancelled",7,"فاکتور تکراری"],
  ]);
});
test("70-G B1 invoice transitions retain reason/note legacy fallback",()=>{
  const a=controller();
  a.ctrl.disputeInvoice("inv",'"1"',{reason:"legacy"});
  a.ctrl.cancelInvoice("inv",'"2"',{note:"legacy-note"});
  assert.deepEqual(a.calls.map(x=>x.args[3]),["legacy","legacy-note"]);
});
test("70-G B1 If-Match rejection remains fail-closed",()=>{
  const{ctrl,calls}=controller();
  assert.throws(()=>ctrl.reverseReceipt("id","no-version",{comment:"x"}));
  assert.throws(()=>ctrl.disputeInvoice("id","0",{resolution_note:"x"}));
  assert.deepEqual(calls,[]);
});
