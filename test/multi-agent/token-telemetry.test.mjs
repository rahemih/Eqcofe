import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildTelemetryRecord, evaluateBudget, normalizeTaskId, normalizeUsageEvent,
  persistTelemetryRecord, readTelemetryRecord, telemetryPath, validateTelemetryRecord,
  validateTokenBudget,
} from '../../scripts/multi-agent/token-telemetry.mjs';

const budget={expected_max:100,soft_alert:150,hard_cap:200};
const baseEvent={task_id:'TASK-1',agent_id:'BACKEND',source:'MODEL_CLIENT',timestamp:'2026-09-15T12:00:00.000Z',input_tokens:60,context_tokens_read:20,output_tokens:30,files_read:2,files_written:1,model_calls:1,retry_count:0,verification_calls:0,human_rejected:false};

test('token budget ordering is strict and positive',()=>{
  assert.deepEqual(validateTokenBudget(budget),budget);
  assert.throws(()=>validateTokenBudget({expected_max:0,soft_alert:1,hard_cap:2}),/INVALID_TOKEN_BUDGET_ORDER/);
  assert.throws(()=>validateTokenBudget({expected_max:100,soft_alert:100,hard_cap:200}),/INVALID_TOKEN_BUDGET_ORDER/);
});

test('task ids are path-safe and map to canonical telemetry path',()=>{
  assert.equal(normalizeTaskId('MA-TASK_1.2'),'MA-TASK_1.2');
  assert.equal(telemetryPath('MA-TASK_1.2'),'.eqcofe/telemetry/MA-TASK_1.2.json');
  assert.throws(()=>telemetryPath('../oops'),/INVALID_TASK_ID/);
});

test('usage event enforces explicit source, task binding and context subset invariant',()=>{
  assert.equal(normalizeUsageEvent(baseEvent,'TASK-1').source,'MODEL_CLIENT');
  assert.throws(()=>normalizeUsageEvent({...baseEvent,task_id:'TASK-2'},'TASK-1'),/TELEMETRY_TASK_MISMATCH/);
  assert.throws(()=>normalizeUsageEvent({...baseEvent,source:'UNKNOWN'},'TASK-1'),/INVALID_TELEMETRY_SOURCE/);
  assert.throws(()=>normalizeUsageEvent({...baseEvent,context_tokens_read:61},'TASK-1'),/CONTEXT_TOKENS_EXCEED_INPUT/);
});

test('usage event accepts only canonical terminal outcomes',()=>{
  assert.equal(normalizeUsageEvent({...baseEvent,terminal_state:'merged'},'TASK-1').terminal_state,'MERGED');
  assert.equal(normalizeUsageEvent({...baseEvent,terminal_state:'ABORTED'},'TASK-1').terminal_state,'ABORTED');
  assert.equal(normalizeUsageEvent({...baseEvent,terminal_state:null},'TASK-1').terminal_state,undefined);
  assert.throws(()=>normalizeUsageEvent({...baseEvent,terminal_state:'HUMAN_PENDING'},'TASK-1'),/INVALID_TERMINAL_STATE/);
  assert.throws(()=>normalizeUsageEvent({...baseEvent,terminal_state:'FAILED_LABEL'},'TASK-1'),/INVALID_TERMINAL_STATE/);
  assert.throws(()=>normalizeUsageEvent({...baseEvent,terminal_state:'   '},'TASK-1'),/INVALID_TERMINAL_STATE/);
});

test('usage event rejects negative and inconsistent total token counts',()=>{
  assert.throws(()=>normalizeUsageEvent({...baseEvent,output_tokens:-1},'TASK-1'),/INVALID_OUTPUT_TOKENS/);
  assert.throws(()=>normalizeUsageEvent({...baseEvent,total_tokens:999},'TASK-1'),/INCONSISTENT_TOTAL_TOKENS/);
  assert.equal(normalizeUsageEvent({...baseEvent,total_tokens:90},'TASK-1').output_tokens,30);
});

test('budget status is deterministic at all thresholds',()=>{
  assert.equal(evaluateBudget(100,budget),'NORMAL');
  assert.equal(evaluateBudget(101,budget),'EXPECTED_EXCEEDED');
  assert.equal(evaluateBudget(150,budget),'SOFT_ALERT');
  assert.equal(evaluateBudget(200,budget),'HARD_CAP_EXCEEDED');
});

test('aggregate does not double count context tokens and sorts provenance deterministically',()=>{
  const events=[
    {...baseEvent,timestamp:'2026-09-15T12:00:02.000Z',input_tokens:40,context_tokens_read:10,output_tokens:20,source:'MANUAL_REPORTED',terminal_state:'MERGED'},
    baseEvent,
  ];
  const record=buildTelemetryRecord({task_id:'TASK-1',token_budget:{expected_max:100,soft_alert:150,hard_cap:300},events});
  assert.equal(record.measurements.input_tokens,100);
  assert.equal(record.measurements.context_tokens_read,30);
  assert.equal(record.measurements.output_tokens,50);
  assert.equal(record.measurements.total_model_tokens,150);
  assert.equal(record.budget_status,'SOFT_ALERT');
  assert.deepEqual(record.sources,['MANUAL_REPORTED','MODEL_CLIENT']);
  assert.equal(record.terminal_state,'MERGED');
  assert.equal(record.calibration_primary_sample,true);
});

test('aborted or human-rejected tasks are retained but excluded from primary calibration sample',()=>{
  const aborted=buildTelemetryRecord({task_id:'TASK-1',token_budget:budget,events:[{...baseEvent,terminal_state:'ABORTED'}]});
  assert.equal(aborted.calibration_primary_sample,false);
  const rejected=buildTelemetryRecord({task_id:'TASK-1',token_budget:budget,events:[{...baseEvent,terminal_state:'MERGED',human_rejected:true}]});
  assert.equal(rejected.calibration_primary_sample,false);
});

test('record persistence uses canonical path and refuses fabricated empty telemetry',async()=>{
  assert.throws(()=>buildTelemetryRecord({task_id:'TASK-1',token_budget:budget,events:[]}),/TELEMETRY_EVENTS_REQUIRED/);
  const root=await mkdtemp(path.join(os.tmpdir(),'eqcofe-telemetry-'));
  const record=buildTelemetryRecord({task_id:'TASK-1',token_budget:budget,events:[baseEvent]});
  const relative=await persistTelemetryRecord(root,record);
  assert.equal(relative,'.eqcofe/telemetry/TASK-1.json');
  const stored=JSON.parse(await readFile(path.join(root,...relative.split('/')),'utf8'));
  assert.equal(stored.task_id,'TASK-1');
  assert.equal(stored.provenance.explicit_usage_only,true);
});

test('verified readback returns the canonical deterministic telemetry record',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'eqcofe-telemetry-readback-'));
  const record=buildTelemetryRecord({
    task_id:'TASK-1',
    token_budget:budget,
    events:[{...baseEvent,terminal_state:'MERGED'}],
  });
  await persistTelemetryRecord(root,record);
  const loaded=await readTelemetryRecord(root,'TASK-1');
  assert.deepEqual(loaded,record);
  assert.equal(loaded.calibration_primary_sample,true);
});

test('telemetry integrity validation fails closed on tampered derived aggregates',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'eqcofe-telemetry-tamper-'));
  const record=buildTelemetryRecord({task_id:'TASK-1',token_budget:budget,events:[baseEvent]});
  const tampered={...record,measurements:{...record.measurements,total_model_tokens:999}};
  assert.throws(()=>validateTelemetryRecord(tampered,'TASK-1'),/TELEMETRY_RECORD_INTEGRITY_MISMATCH/);
  await assert.rejects(()=>persistTelemetryRecord(root,tampered),/TELEMETRY_RECORD_INTEGRITY_MISMATCH/);

  const relative=telemetryPath('TASK-1');
  const target=path.join(root,...relative.split('/'));
  await persistTelemetryRecord(root,record);
  await writeFile(target,`${JSON.stringify(tampered,null,2)}\n`,'utf8');
  await assert.rejects(()=>readTelemetryRecord(root,'TASK-1'),/TELEMETRY_RECORD_INTEGRITY_MISMATCH/);
});

test('verified readback rejects invalid JSON and task-id mismatch',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'eqcofe-telemetry-invalid-'));
  const relative=telemetryPath('TASK-1');
  const target=path.join(root,...relative.split('/'));
  await persistTelemetryRecord(root,buildTelemetryRecord({task_id:'TASK-1',token_budget:budget,events:[baseEvent]}));
  await writeFile(target,'{not-json}\n','utf8');
  await assert.rejects(()=>readTelemetryRecord(root,'TASK-1'),/INVALID_TELEMETRY_JSON/);

  const mismatched=buildTelemetryRecord({task_id:'TASK-2',token_budget:budget,events:[{...baseEvent,task_id:'TASK-2'}]});
  await writeFile(target,`${JSON.stringify(mismatched,null,2)}\n`,'utf8');
  await assert.rejects(()=>readTelemetryRecord(root,'TASK-1'),/TELEMETRY_TASK_MISMATCH/);
});

test('conflicting canonical terminal outcomes fail closed regardless of event order',()=>{
  const later={...baseEvent,timestamp:'2026-09-15T12:00:01.000Z'};
  assert.throws(
    ()=>buildTelemetryRecord({
      task_id:'TASK-1',
      token_budget:budget,
      events:[
        {...baseEvent,terminal_state:'MERGED'},
        {...later,terminal_state:'ABORTED'},
      ],
    }),
    /CONFLICTING_TERMINAL_STATES/,
  );
  assert.throws(
    ()=>buildTelemetryRecord({
      task_id:'TASK-1',
      token_budget:budget,
      events:[
        {...baseEvent,terminal_state:'ABORTED'},
        {...later,terminal_state:'MERGED'},
      ],
    }),
    /CONFLICTING_TERMINAL_STATES/,
  );
});

test('repeated identical terminal outcomes remain deterministic and valid',()=>{
  const later={...baseEvent,timestamp:'2026-09-15T12:00:01.000Z'};
  const merged=buildTelemetryRecord({
    task_id:'TASK-1',
    token_budget:budget,
    events:[
      {...baseEvent,terminal_state:'MERGED'},
      {...later,terminal_state:'merged'},
    ],
  });
  assert.equal(merged.terminal_state,'MERGED');
  assert.equal(merged.calibration_primary_sample,true);

  const aborted=buildTelemetryRecord({
    task_id:'TASK-1',
    token_budget:budget,
    events:[
      {...baseEvent,terminal_state:'ABORTED'},
      {...later,terminal_state:'aborted'},
    ],
  });
  assert.equal(aborted.terminal_state,'ABORTED');
  assert.equal(aborted.calibration_primary_sample,false);
});

