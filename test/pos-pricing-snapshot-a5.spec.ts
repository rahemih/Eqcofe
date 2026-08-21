import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PosPricingSnapshotService } from '../src/modules/pos/application/pos-pricing-snapshot.service';

const uuid=(n:string)=>`${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const sale=uuid('1'),staff=uuid('2'),line=uuid('3'),variant=uuid('4'),priceId=uuid('5');

function setup(quote:any){
  const calls:any[]=[];
  const repo:any={
    byId:async()=>({id:sale,staff_actor_id:staff,status:'draft'}),
    linesForUpdate:async()=>[{id:line,variant_id:variant,quantity:2}],
    applyPriceSnapshot:async(_ex:any,input:any)=>{calls.push(['snapshot',input]);return input;},
    updateTotals:async(_ex:any,_saleId:string,subtotal:number,discount:number,total:number)=>{calls.push(['totals',subtotal,discount,total]);return {id:sale};},
  };
  const tx:any={run:(fn:any)=>fn({})};
  const pricing:any={quoteVariant:async()=>quote};
  return {svc:new PosPricingSnapshotService(tx,repo,pricing),calls};
}

test('Step 49 A5 snapshots authoritative Pricing quote and computes integer Toman totals',async()=>{
  const {svc,calls}=setup({base_price_id:priceId,base_price_toman:120000,discount_toman:20000,current_toman:100000,applied_rule_ids:['r1']});
  const out=await svc.priceDraft({saleId:sale,staffActorId:staff});
  assert.equal(out.subtotal_toman,240000);assert.equal(out.discount_total_toman,40000);assert.equal(out.total_toman,200000);
  assert.equal(calls.filter(x=>x[0]==='snapshot').length,1);assert.deepEqual(calls.find(x=>x[0]==='totals')?.slice(1),[240000,40000,200000]);
});

test('Step 49 A5 fails closed when Pricing has no authoritative quote',async()=>{
  const {svc}=setup(null);
  await assert.rejects(()=>svc.priceDraft({saleId:sale,staffActorId:staff}),(e:any)=>e.code==='POS_PRICE_UNAVAILABLE');
});

test('Step 49 A5 rejects inconsistent or non-integer Toman pricing output',async()=>{
  const {svc}=setup({base_price_id:priceId,base_price_toman:100000,discount_toman:10000,current_toman:95000,applied_rule_ids:[]});
  await assert.rejects(()=>svc.priceDraft({saleId:sale,staffActorId:staff}),(e:any)=>e.code==='POS_PRICE_INVALID');
});

test('Step 49 A5 migration persists snapshots and database-enforces sale total identity',()=>{
  const sql=readFileSync('database/migrations/0050_pos_pricing_snapshot.sql','utf8');
  assert.match(sql,/unit_price_toman bigint/);assert.match(sql,/subtotal_toman - discount_total_toman = total_toman/);assert.match(sql,/pricing_rule_ids jsonb/);
});

test('Step 49 A5 imports canonical PricingModule and does not implement a POS price engine',()=>{
  const module=readFileSync('src/modules/pos/pos.module.ts','utf8');
  const service=readFileSync('src/modules/pos/application/pos-pricing-snapshot.service.ts','utf8');
  assert.match(module,/PricingModule/);assert.match(service,/PricingQueryService/);assert.doesNotMatch(service,/new PricingEngine|effectiveRules|currentBasePrice/);
});

test('Step 49 A5 adds no payment finance inventory consumption or HTTP authority',()=>{
  const service=readFileSync('src/modules/pos/application/pos-pricing-snapshot.service.ts','utf8');
  assert.doesNotMatch(service,/Payments|Finance|InventoryPosService|Controller|@Post|@Patch/);
});
