import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { InventoryPosService } from '../src/modules/inventory/application/inventory-pos.service';
import { onlineSellable, physicalAvailable } from '../src/modules/inventory/domain/inventory.math';

const uuid=(n:string)=>`${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const warehouse=uuid('1'), variant=uuid('2'), sale=uuid('3'), staff=uuid('4');

function service(balance:any,layers:any[]){
  const calls:any[]=[];
  const repo:any={
    lockBalance:async()=>balance,
    fifoLayers:async()=>layers,
    consumeLayer:async(_ex:any,id:string,q:number)=>calls.push(['layer',id,q]),
    movement:async(_ex:any,i:any)=>calls.push(['movement',i]),
    insertCostConsumption:async(_ex:any,i:any)=>calls.push(['cost',i]),
    updateBalance:async(_ex:any,w:string,v:string,d:any)=>calls.push(['balance',w,v,d]),
  };
  const tx:any={run:(fn:any)=>fn({})};
  return {svc:new InventoryPosService(tx,repo),calls};
}

test('Step 49 A4 physical sale consumes only unencumbered stock', async()=>{
  const {svc,calls}=service({on_hand:20,reserved:5,allocated:3,damaged:1,quarantine:1},[{id:uuid('5'),remaining_quantity:20,effective_unit_cost_toman:1000,received_at:'2026-01-01'}]);
  assert.equal(physicalAvailable({onHand:20,reserved:5,allocated:3,damaged:1,quarantine:1}),10);
  const r=await svc.consumePhysicalSale({warehouseId:warehouse,variantId:variant,quantity:10,saleReferenceId:sale,staffActorId:staff});
  assert.equal(r.quantity,10); assert.deepEqual(calls.at(-1),['balance',warehouse,variant,{onHand:-10}]);
  await assert.rejects(()=>svc.consumePhysicalSale({warehouseId:warehouse,variantId:variant,quantity:11,saleReferenceId:sale,staffActorId:staff}));
});

test('Step 49 A4 preserves online physical protection rule',()=>{
  const b={onHand:100,reserved:0,allocated:0,damaged:0,quarantine:0,protectionPercent:20};
  assert.equal(physicalAvailable(b),100); assert.equal(onlineSellable(b),80);
});

test('Step 49 A4 consumes FIFO cost layers and records immutable movement lineage',async()=>{
  const {svc,calls}=service({on_hand:10,reserved:0,allocated:0,damaged:0,quarantine:0},[
    {id:uuid('5'),remaining_quantity:2,effective_unit_cost_toman:1000,received_at:'2026-01-01'},
    {id:uuid('6'),remaining_quantity:5,effective_unit_cost_toman:2000,received_at:'2026-02-01'}]);
  const r=await svc.consumePhysicalSale({warehouseId:warehouse,variantId:variant,quantity:3,saleReferenceId:sale,staffActorId:staff});
  assert.equal(r.total_cost_toman,4000); assert.equal(r.weighted_unit_cost_toman,1333);
  assert.equal(calls.filter(x=>x[0]==='movement').length,2); assert.equal(calls.filter(x=>x[0]==='cost').length,2);
});

test('Step 49 A4 fails closed when cost lineage cannot satisfy physical consumption',async()=>{
  const {svc}=service({on_hand:10,reserved:0,allocated:0,damaged:0,quarantine:0},[{id:uuid('5'),remaining_quantity:1,effective_unit_cost_toman:1000,received_at:'2026-01-01'}]);
  await assert.rejects(()=>svc.consumePhysicalSale({warehouseId:warehouse,variantId:variant,quantity:2,saleReferenceId:sale,staffActorId:staff}));
});

test('Step 49 A4 keeps inventory authority in Inventory and POS delegates only',()=>{
  const pos=readFileSync('src/modules/pos/application/pos-inventory-consumption.service.ts','utf8');
  const inv=readFileSync('src/modules/inventory/application/inventory-pos.service.ts','utf8');
  assert.doesNotMatch(pos,/KYSELY_DB|stock_balances|cost_layers|sql`/); assert.match(inv,/lockBalance/); assert.match(inv,/fifoLayers/);
});

test('Step 49 A4 adds no new pricing payment finance or offline authority',()=>{
  const pos=readFileSync('src/modules/pos/application/pos-inventory-consumption.service.ts','utf8');
  const module=readFileSync('src/modules/pos/pos.module.ts','utf8');
  assert.match(module,/InventoryModule/); assert.doesNotMatch(pos,/Pricing|Payment|Finance|offline|reconciliation/i);
});
