import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildTelemetryRecord, evaluateBudget, normalizeTaskId, normalizeUsageEvent,
  persistTelemetryRecord, telemetryPath, validateTokenBudget,
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
