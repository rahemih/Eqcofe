import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OfflineCommandSyncService } from '../src/modules/pos/application/offline-command-sync.service';

const uuid=(n:string)=>`${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const commandId=uuid('1'),staffId=uuid('2'),warehouseId=uuid('3'),variantId=uuid('4'),saleId=uuid('5');
const payload={warehouse_id:warehouseId,customer_type:'retail',payment_method:'cash',external_reference:null,lines:[{variant_id:variantId,quantity:2}]};

function make(overrides:any={}){
  const calls:any[]=[];
  let command:any=overrides.command??{id:commandId,client_command_id:commandId,staff_actor_id:staffId,command_type:'sale.sync',payload,status:'queued',payload_hash:'a'.repeat(64)};
  const tx:any={run:(fn:any)=>fn({})};
  const commands:any={
    create:async(_ex:any,input:any)=>{calls.push(['capture',input]);if(overrides.captureReplay)return null;command={...command,...input,client_command_id:input.clientCommandId,staff_actor_id:input.staffActorId,command_type:input.commandType,payload_hash:input.payloadHash,payload:input.payload};return command;},
    byClientCommandId:async()=>command,
    byId:async()=>command,
    markApplied:async(_ex:any,_id:string,result:any)=>{calls.push(['applied',result]);command={...command,status:'applied',result,applied_at:new Date()};return command;},
    markFailed:async(_ex:any,_id:string,code:string)=>{calls.push(['failed',code]);command={...command,status:'failed',error_code:code,failed_at:new Date()};return command;},
    lockLineIdentity:async()=>calls.push(['line-lock']),
    lineEffect:async()=>overrides.priorLineEffect??null,
    recordLineEffect:async(_ex:any,input:any)=>{calls.push(['line-effect',input]);return input;},
  };
  const sales:any={createDraft:async()=>{calls.push(['create-sale']);return overrides.sale??{id:saleId,status:'draft',version:1,staff_actor_id:staffId};}};
  const saleRepo:any={
    byId:async(_id:string,_ex?:any,lock?:boolean)=>{if(lock)return{id:saleId,status:'draft',version:1,staff_actor_id:staffId};return{id:saleId,status:'draft',version:3,staff_actor_id:staffId};},
    addOrIncreaseLine:async(_ex:any,input:any)=>{calls.push(['add-line',input]);return{id:uuid('6'),...input};},
  };
  const pricing:any={priceDraft:async(input:any)=>{calls.push(['price',input]);if(overrides.priceError)throw overrides.priceError;return{total_toman:1000};}};
  const commit:any={commit:async(input:any)=>{calls.push(['commit',input]);if(overrides.commitError)throw overrides.commitError;return{id:saleId,status:'committed',version:4};}};
  const ctx:any={get:()=>overrides.noActor?undefined:{actor:{type:'staff',id:staffId},requestId:uuid('7'),correlationId:uuid('8')}};
  return{svc:new OfflineCommandSyncService(tx,commands,sales,saleRepo,pricing,commit,ctx),calls,getCommand:()=>command};
}

test('Step 49 A7 capture stores only normalized allow-listed sale sync intent',async()=>{
  const {svc,calls}=make();
  const row:any=await svc.capture({clientCommandId:commandId,commandType:'sale.sync',payload:{...payload,lines:[{variant_id:variantId,quantity:1},{variant_id:variantId,quantity:1}]}});
  assert.equal(row.command_type,'sale.sync');
  assert.equal(calls[0][1].payload.lines.length,1);
  assert.equal(calls[0][1].payload.lines[0].quantity,2);
  assert.match(calls[0][1].payloadHash,/^[0-9a-f]{64}$/);
});

test('Step 49 A7 rejects offline price stock payment-state and secret-like extra fields',()=>{
  const {svc}=make();
  assert.throws(()=>svc.capture({clientCommandId:commandId,commandType:'sale.sync',payload:{...payload,price_toman:1}}),(e:any)=>e.code==='POS_OFFLINE_PAYLOAD_FIELD_FORBIDDEN');
  assert.throws(()=>svc.capture({clientCommandId:commandId,commandType:'sale.sync',payload:{...payload,lines:[{variant_id:variantId,quantity:1,stock:99}]}}),(e:any)=>e.code==='POS_OFFLINE_LINE_FIELD_FORBIDDEN');
});

test('Step 49 A7 capture replay is idempotent and conflicting identity fails closed',async()=>{
  const first=make();const row:any=await first.svc.capture({clientCommandId:commandId,commandType:'sale.sync',payload});assert.equal(row.client_command_id,commandId);
  const replay=make({captureReplay:true});replay.getCommand().payload_hash='bad';
  await assert.rejects(()=>replay.svc.capture({clientCommandId:commandId,commandType:'sale.sync',payload}),(e:any)=>e.code==='POS_OFFLINE_IDEMPOTENCY_CONFLICT');
});

test('Step 49 A7 sync replays through canonical create line price and commit boundaries',async()=>{
  const {svc,calls}=make();
  const out:any=await svc.sync(commandId);
  assert.equal(out.status,'applied');
  const names=calls.map(x=>x[0]);
  assert.ok(names.indexOf('create-sale')<names.indexOf('add-line'));
  assert.ok(names.indexOf('add-line')<names.indexOf('price'));
  assert.ok(names.indexOf('price')<names.indexOf('commit'));
  assert.equal(calls.find(x=>x[0]==='commit')[1].expectedVersion,3);
});

test('Step 49 A7 line effects are replay-safe and do not double increment quantity',async()=>{
  const prior={command_id:commandId,line_index:0,sale_id:saleId,variant_id:variantId,quantity:2};
  const {svc,calls}=make({priorLineEffect:prior});
  await svc.sync(commandId);
  assert.equal(calls.filter(x=>x[0]==='add-line').length,0);
  assert.equal(calls.filter(x=>x[0]==='price').length,1);
  assert.equal(calls.filter(x=>x[0]==='commit').length,1);
});

test('Step 49 A7 failed sync becomes observable and is not auto-replayed',async()=>{
  const err:any=new Error('stock changed');err.code='INVENTORY_INSUFFICIENT_STOCK';
  const first=make({commitError:err});
  await assert.rejects(()=>first.svc.sync(commandId),(e:any)=>e.code==='INVENTORY_INSUFFICIENT_STOCK');
  assert.equal(first.calls.filter(x=>x[0]==='failed').length,1);
  const failed=make({command:{...first.getCommand(),status:'failed',error_code:'INVENTORY_INSUFFICIENT_STOCK'}});
  await assert.rejects(()=>failed.svc.sync(commandId),(e:any)=>e.code==='POS_OFFLINE_COMMAND_FAILED');
  assert.equal(failed.calls.length,0);
});

test('Step 49 A7 persistence is forward-only, server-authoritative and leaves reconciliation to A8',()=>{
  const sql=readFileSync('database/migrations/0052_pos_offline_command_sync.sql','utf8');
  const svc=readFileSync('src/modules/pos/application/offline-command-sync.service.ts','utf8');
  assert.match(sql,/pos\.offline_commands/);
  assert.match(sql,/client_command_id uuid NOT NULL UNIQUE/);
  assert.match(sql,/offline_command_line_effects/);
  assert.match(svc,/PosPricingSnapshotService/);
  assert.match(svc,/PhysicalSaleCommitService/);
  assert.doesNotMatch(svc,/price_toman|stock_toman|paid_status|secret|password|token/);
  assert.doesNotMatch(sql,/ALTER TABLE .* DROP COLUMN|DROP TABLE|TRUNCATE/);
});
