import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OfflineReconciliationService } from '../src/modules/pos/application/offline-reconciliation.service';

const uuid=(n:string)=>`${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const staffId=uuid('1'),clientId=uuid('2'),commandId=uuid('3');

function make(overrides:any={}){
  let command:any={id:commandId,client_command_id:clientId,staff_actor_id:staffId,status:'failed',error_code:'POS_PRICE_UNAVAILABLE',recovery_count:0,...overrides.command};
  const history:any[]=[];
  const repo:any={
    byClientCommandId:async()=>command,
    reconciliationHistory:async()=>history,
    failedForStaff:async()=>[command],
    reopenFailedForRetry:async(_ex:any,input:any)=>{history.push({action:'retry_requested',prior_error_code:command.error_code,recovery_count:command.recovery_count+1,note:input.note});command={...command,status:'queued',error_code:null,recovery_count:command.recovery_count+1};return command;},
    abandonFailed:async(_ex:any,input:any)=>{history.push({action:'abandoned',prior_error_code:command.error_code,recovery_count:command.recovery_count,note:input.note});command={...command,status:'abandoned',abandoned_at:new Date()};return command;},
  };
  const sync:any={sync:async()=>overrides.syncError?Promise.reject(overrides.syncError):({...command,status:'applied',result:{sale_id:uuid('4')}})};
  const ctx:any={get:()=>overrides.actor===null?undefined:{actor:{type:'staff',id:overrides.staffId??staffId}}};
  const tx:any={run:(fn:any)=>fn({})};
  return{svc:new OfflineReconciliationService(tx,repo,sync,ctx),repo,getCommand:()=>command,history};
}

test('Step 49 A8 lists and inspects only current staff reconciliation records',async()=>{
  const {svc}=make();
  const listed:any[]=await svc.listFailed(20);
  assert.equal(listed.length,1);
  const inspected:any=await svc.inspect(clientId);
  assert.equal(inspected.command.client_command_id,clientId);
});

test('Step 49 A8 explicit retry reopens failed command then delegates to canonical A7 sync',async()=>{
  const {svc,history}=make();
  const result:any=await svc.retry(clientId,'stock replenished');
  assert.equal(result.status,'applied');
  assert.equal(history[0].action,'retry_requested');
  assert.equal(history[0].prior_error_code,'POS_PRICE_UNAVAILABLE');
});

test('Step 49 A8 retry is bounded and terminal abandoned command cannot recover',async()=>{
  const maxed=make({command:{recovery_count:5}}).svc;
  await assert.rejects(()=>maxed.retry(clientId),(e:any)=>e.code==='POS_RECONCILIATION_RETRY_LIMIT');
  const abandoned=make({command:{status:'abandoned',error_code:'POS_PRICE_UNAVAILABLE'}}).svc;
  await assert.rejects(()=>abandoned.retry(clientId),(e:any)=>e.code==='POS_RECONCILIATION_TERMINAL');
});

test('Step 49 A8 abandon is explicit terminal recovery decision and replay-safe',async()=>{
  const state=make();
  const first:any=await state.svc.abandon(clientId,'operator accepted loss');
  assert.equal(first.status,'abandoned');
  const second:any=await state.svc.abandon(clientId,'ignored on replay');
  assert.equal(second.status,'abandoned');
  assert.equal(state.history.length,1);
});

test('Step 49 A8 rejects cross-staff recovery and unsafe notes',async()=>{
  const other=make({staffId:uuid('9')}).svc;
  await assert.rejects(()=>other.retry(clientId),(e:any)=>e.code==='POS_OFFLINE_COMMAND_NOT_FOUND');
  const {svc}=make();
  await assert.rejects(()=>svc.abandon(clientId,'bad\u0001note'),(e:any)=>e.code==='POS_RECONCILIATION_NOTE_INVALID');
});

test('Step 49 A8 migration preserves immutable recovery history and bounded retry count',()=>{
  const sql=readFileSync('database/migrations/0053_pos_offline_reconciliation.sql','utf8');
  assert.match(sql,/status IN \('queued','applied','failed','abandoned'\)/);
  assert.match(sql,/recovery_count BETWEEN 0 AND 5/);
  assert.match(sql,/offline_command_reconciliation_history/);
  assert.match(sql,/BEFORE UPDATE OR DELETE/);
  assert.match(sql,/retry_requested','abandoned/);
});

test('Step 49 A8 recovery never rewrites payload price stock payment or historical line effects',()=>{
  const svc=readFileSync('src/modules/pos/application/offline-reconciliation.service.ts','utf8');
  const repo=readFileSync('src/modules/pos/infrastructure/offline-command.repository.ts','utf8');
  assert.doesNotMatch(svc,/payload\s*=|price_toman|stock_quantity|cogs_toman/);
  assert.doesNotMatch(repo,/UPDATE pos\.offline_command_line_effects|DELETE FROM pos\.offline_command_line_effects/);
  assert.match(svc,/syncService\.sync/);
  assert.match(repo,/status='failed'/);
});
