import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PhysicalSaleCommitService } from '../src/modules/pos/application/physical-sale-commit.service';

const uuid=(n:string)=>`${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const saleId=uuid('1'),warehouseId=uuid('2'),staffId=uuid('3'),receiptId=uuid('4'),variantA=uuid('5'),variantB=uuid('6');

function make(overrides:any={}){
  const calls:any[]=[];
  const sale={id:saleId,staff_actor_id:staffId,status:'draft',version:5,total_toman:3000,...overrides.sale};
  const lines=overrides.lines??[
    {id:uuid('7'),variant_id:variantA,quantity:2,unit_price_toman:1000,priced_at:new Date()},
    {id:uuid('8'),variant_id:variantB,quantity:1,unit_price_toman:1000,priced_at:new Date()},
  ];
  const repo:any={
    byId:async()=>sale,
    linesForUpdate:async()=>lines,
    commitDraft:async(_ex:any,input:any)=>{calls.push(['commit',input]);return{...sale,status:'committed',version:6,payment_receipt_id:input.paymentReceiptId,total_cost_toman:input.totalCostToman};},
  };
  const inventory:any={consumePhysicalSaleInTransaction:async(_ex:any,input:any)=>{calls.push(['inventory',input]);return{total_cost_toman:input.variantId===variantA?1200:700,movement_ids:[uuid(input.variantId===variantA?'9':'a')]};}};
  const payments:any={confirmInTransaction:async(_ex:any,input:any)=>{calls.push(['payment',input]);return{id:receiptId,...input};}};
  const outbox:any={append:async(_ex:any,events:any[])=>calls.push(['event',events[0]])};
  const ctx:any={get:()=>overrides.actor===null?undefined:{actor:{type:'staff',id:staffId},requestId:uuid('b'),correlationId:uuid('c')}};
  const tx:any={run:(fn:any)=>fn({})};
  return{svc:new PhysicalSaleCommitService(tx,repo,inventory,payments,outbox,ctx),calls};
}

test('Step 49 A6 commits only through Payments and Inventory authoritative boundaries',async()=>{
  const {svc,calls}=make();
  const result:any=await svc.commit({saleId,warehouseId,expectedVersion:5,paymentMethod:'card',externalReference:'TERM-1'});
  assert.equal(result.status,'committed');
  assert.equal(calls[0][0],'payment');
  assert.equal(calls.filter(x=>x[0]==='inventory').length,2);
  assert.equal(calls.find(x=>x[0]==='commit')[1].totalCostToman,1900);
  assert.equal(calls.find(x=>x[0]==='event')[1].payload.revenue_toman,3000);
  assert.equal(calls.find(x=>x[0]==='event')[1].payload.cogs_toman,1900);
});

test('Step 49 A6 requires authenticated staff and optimistic version',async()=>{
  const noStaff=make({actor:null}).svc;
  await assert.rejects(()=>noStaff.commit({saleId,warehouseId,expectedVersion:5,paymentMethod:'cash'}),(e:any)=>e.code==='POS_STAFF_REQUIRED');
  const wrong=make({sale:{version:6}}).svc;
  await assert.rejects(()=>wrong.commit({saleId,warehouseId,expectedVersion:5,paymentMethod:'cash'}),(e:any)=>e.code==='POS_SALE_VERSION_CONFLICT');
});

test('Step 49 A6 refuses unpriced sale before payment or inventory mutation',async()=>{
  const {svc,calls}=make({lines:[{id:uuid('7'),variant_id:variantA,quantity:1,unit_price_toman:null,priced_at:null}]});
  await assert.rejects(()=>svc.commit({saleId,warehouseId,expectedVersion:5,paymentMethod:'cash'}),(e:any)=>e.code==='POS_SALE_PRICE_SNAPSHOT_REQUIRED');
  assert.equal(calls.length,0);
});

test('Step 49 A6 migration keeps payment and finance authority in owning schemas',()=>{
  const sql=readFileSync('database/migrations/0051_pos_commit_payment_finance.sql','utf8');
  assert.match(sql,/payments\.physical_sale_receipts/);
  assert.match(sql,/finance\.pos_sale_financial_facts/);
  assert.match(sql,/status IN \('draft','committed','voided'\)/);
  assert.match(sql,/revenue_toman - cogs_toman = gross_profit_toman/);
  assert.match(sql,/DEFERRABLE INITIALLY DEFERRED/);
});

test('Step 49 A6 Finance consumes committed sale event idempotently',()=>{
  const src=readFileSync('src/modules/finance/application/finance-cross-domain.consumer.ts','utf8');
  assert.match(src,/pos\.sale\.committed\.v1/);
  assert.match(src,/finance\.pos_sale_financial_facts/);
  assert.match(src,/ON CONFLICT \(sale_id\) DO NOTHING/);
  assert.doesNotMatch(src,/UPDATE finance\.pos_sale_financial_facts/);
});

test('Step 49 A6 POS imports Payments but does not fabricate online order payment lifecycle',()=>{
  const mod=readFileSync('src/modules/pos/pos.module.ts','utf8');
  const svc=readFileSync('src/modules/pos/application/physical-sale-commit.service.ts','utf8');
  assert.match(mod,/PaymentsModule/);
  assert.match(svc,/PhysicalSalePaymentService/);
  assert.match(svc,/InventoryPosService/);
  assert.doesNotMatch(svc,/PaymentService/);
  assert.doesNotMatch(svc,/orders\.orders|payments\.payments/);
});
