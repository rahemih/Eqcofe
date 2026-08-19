import test from 'node:test';
import assert from 'node:assert/strict';
import { InventoryFulfillmentService } from '../src/modules/inventory/application/ports/inventory-fulfillment.service';

function service(rows:any[],allocations:any[]=[]){
  const repo:any={
    reservation:async()=>({id:'r1',status:'converted'}),
    reservationItems:async()=>rows,
    allocationsForOrderItems:async()=>allocations,
  };
  const ctx:any={get:()=>({actor:{type:'staff',id:'s1'}})};
  const outbox:any={};
  const scopes:any={assert:()=>{}};
  return new InventoryFulfillmentService(repo,ctx,outbox,scopes);
}
const items=[{orderItemId:'i1',variantId:'v1',quantity:2},{orderItemId:'i2',variantId:'v2',quantity:1}];

test('single_warehouse_preferred chooses one warehouse when reservation can satisfy all lines there',async()=>{
  const s=service([
    {warehouse_id:'00000000-0000-0000-0000-000000000001',variant_id:'v1',quantity:2,allocated_quantity:0,released_quantity:0},
    {warehouse_id:'00000000-0000-0000-0000-000000000001',variant_id:'v2',quantity:1,allocated_quantity:0,released_quantity:0},
    {warehouse_id:'00000000-0000-0000-0000-000000000002',variant_id:'v1',quantity:2,allocated_quantity:0,released_quantity:0},
  ]);
  const plan=await s.planSingleWarehousePreferred({} as any,{reservationId:'r1',items});
  assert.equal(plan.length,2);assert.ok(plan.every(x=>x.warehouseId.endsWith('0001')));assert.deepEqual(plan.map(x=>x.quantity),[2,1]);
});

test('single_warehouse_preferred falls back deterministically across existing reservation warehouses',async()=>{
  const s=service([
    {warehouse_id:'00000000-0000-0000-0000-000000000001',variant_id:'v1',quantity:2,allocated_quantity:0,released_quantity:0},
    {warehouse_id:'00000000-0000-0000-0000-000000000002',variant_id:'v2',quantity:1,allocated_quantity:0,released_quantity:0},
  ]);
  const plan=await s.planSingleWarehousePreferred({} as any,{reservationId:'r1',items});
  assert.deepEqual(plan.map(x=>[x.orderItemId,x.warehouseId.slice(-4),x.quantity]),[['i1','0001',2],['i2','0002',1]]);
});

test('planner accounts for existing active allocations and fails closed on insufficient reserved commitment',async()=>{
  const s=service([
    {warehouse_id:'00000000-0000-0000-0000-000000000001',variant_id:'v1',quantity:2,allocated_quantity:1,released_quantity:0},
    {warehouse_id:'00000000-0000-0000-0000-000000000001',variant_id:'v2',quantity:1,allocated_quantity:0,released_quantity:0},
  ],[{order_item_id:'i1',status:'allocated',quantity:1}]);
  const plan=await s.planSingleWarehousePreferred({} as any,{reservationId:'r1',items});
  assert.deepEqual(plan.map(x=>[x.orderItemId,x.quantity]),[['i1',1],['i2',1]]);
  const broken=service([{warehouse_id:'00000000-0000-0000-0000-000000000001',variant_id:'v1',quantity:1,allocated_quantity:0,released_quantity:0}]);
  await assert.rejects(()=>broken.planSingleWarehousePreferred({} as any,{reservationId:'r1',items}), (e:any)=>e?.code==='INSUFFICIENT_RESERVED_STOCK');
});
