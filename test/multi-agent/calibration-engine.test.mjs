import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildTelemetryRecord,
  persistTelemetryRecord,
  telemetryPath,
} from '../../scripts/multi-agent/token-telemetry.mjs';
import {
  CALIBRATION_RISK_CLASSES,
  MIN_PRIMARY_SAMPLES_PER_RISK,
  calibrateCanonicalRiskClasses,
  validateCalibrationBinding,
} from '../../scripts/multi-agent/calibration-engine.mjs';

const budget = Object.freeze({ expected_max: 1000, soft_alert: 2000, hard_cap: 5000 });

function taskContract(task_id, risk, token_budget = budget) {
  return { task_id, risk, token_budget };
}

function telemetry(task_id, total, options = {}) {
  const {
    terminal_state = 'MERGED',
    human_rejected = false,
    source = 'MODEL_CLIENT',
    token_budget = budget,
  } = options;
  return buildTelemetryRecord({
    task_id,
    token_budget,
    events: [{
      task_id,
      agent_id: 'BACKEND',
      source,
      timestamp: '2026-09-19T10:00:00.000Z',
      input_tokens: total,
      context_tokens_read: 0,
      output_tokens: 0,
      files_read: 1,
      files_written: 1,
      model_calls: 1,
      retry_count: 0,
      verification_calls: 1,
      terminal_state,
      human_rejected,
    }],
  });
}

async function root() {
  return mkdtemp(path.join(os.tmpdir(), 'eqcofe-calibration-'));
}

async function store(rootDir, task_id, total, options = {}) {
  const record = telemetry(task_id, total, options);
  await persistTelemetryRecord(rootDir, record);
  return record;
}

async function overwriteCanonical(rootDir, taskId, value) {
  const relative = telemetryPath(taskId);
  const target = path.join(rootDir, ...relative.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('risk classes and minimum primary sample floor are frozen and deterministic', () => {
  assert.deepEqual(CALIBRATION_RISK_CLASSES, ['LOW', 'MEDIUM', 'HIGH']);
  assert.equal(MIN_PRIMARY_SAMPLES_PER_RISK, 10);
  assert.equal(Object.isFrozen(CALIBRATION_RISK_CLASSES), true);
});

test('missing canonical telemetry is explicit and never converted into zero usage', async () => {
  const rootDir = await root();
  const report = await calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [
      taskContract('LOW-MISSING', 'LOW'),
      taskContract('MEDIUM-MISSING', 'MEDIUM'),
      taskContract('HIGH-MISSING', 'HIGH'),
    ],
  });
  for (const risk of CALIBRATION_RISK_CLASSES) {
    assert.equal(report.classes[risk].disposition, 'INSUFFICIENT_CANONICAL_TELEMETRY');
    assert.equal(report.classes[risk].primary_sample_count, 0);
    assert.equal(report.classes[risk].missing_telemetry_count, 1);
    assert.equal(report.classes[risk].token_quantiles, null);
  }
  assert.equal(report.source_rule, 'CANONICAL_TELEMETRY_READBACK_ONLY');
  assert.equal(report.policy_mutation_allowed, false);
});

test('one canonical successful pilot remains insufficient and cannot emit percentile statistics', async () => {
  const rootDir = await root();
  await store(rootDir, 'LOW-ONE', 400);
  const report = await calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('LOW-ONE', 'LOW')],
  });
  assert.equal(report.classes.LOW.primary_sample_count, 1);
  assert.equal(report.classes.LOW.disposition, 'INSUFFICIENT_CANONICAL_TELEMETRY');
  assert.equal(report.classes.LOW.token_quantiles, null);
});

test('exactly ten canonical primary samples unlock deterministic nearest-rank quantiles only for that risk class', async () => {
  const rootDir = await root();
  const contracts = [];
  for (let index = 0; index < 10; index += 1) {
    const taskId = `LOW-${index + 1}`;
    contracts.push(taskContract(taskId, 'LOW'));
    await store(rootDir, taskId, (index + 1) * 10);
  }
  const report = await calibrateCanonicalRiskClasses({ root_dir: rootDir, task_contracts: contracts });
  assert.equal(report.classes.LOW.disposition, 'SUFFICIENT_CANONICAL_TELEMETRY');
  assert.equal(report.classes.LOW.primary_sample_count, 10);
  assert.deepEqual(report.classes.LOW.token_quantiles, {
    min: 10,
    p50: 50,
    p75: 80,
    p90: 90,
    max: 100,
    method: 'NEAREST_RANK',
  });
  assert.equal(report.classes.MEDIUM.disposition, 'INSUFFICIENT_CANONICAL_TELEMETRY');
  assert.equal(report.classes.HIGH.disposition, 'INSUFFICIENT_CANONICAL_TELEMETRY');
});

test('human-rejected and non-merged canonical records remain visible but excluded from primary samples', async () => {
  const rootDir = await root();
  await store(rootDir, 'MED-REJECTED', 300, { human_rejected: true });
  await store(rootDir, 'MED-ABORTED', 350, { terminal_state: 'ABORTED' });
  const report = await calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('MED-REJECTED', 'MEDIUM'), taskContract('MED-ABORTED', 'MEDIUM')],
  });
  assert.equal(report.classes.MEDIUM.primary_sample_count, 0);
  assert.equal(report.classes.MEDIUM.excluded_sample_count, 2);
  assert.deepEqual(report.classes.MEDIUM.exclusion_reasons, {
    HUMAN_REJECTED: 1,
    TERMINAL_STATE_NOT_MERGED: 1,
  });
});

test('tampered aggregate stored at canonical path fails closed instead of becoming a sample', async () => {
  const rootDir = await root();
  const record = telemetry('LOW-TAMPER', 400);
  await overwriteCanonical(rootDir, 'LOW-TAMPER', {
    ...record,
    measurements: { ...record.measurements, total_model_tokens: 1 },
  });
  await assert.rejects(() => calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('LOW-TAMPER', 'LOW')],
  }), /TELEMETRY_RECORD_INTEGRITY_MISMATCH/);
});

test('invalid provenance stored at canonical path fails closed', async () => {
  const rootDir = await root();
  const record = telemetry('LOW-SOURCE', 400);
  await overwriteCanonical(rootDir, 'LOW-SOURCE', {
    ...record,
    events: record.events.map((event) => ({ ...event, source: 'SYNTHETIC' })),
  });
  await assert.rejects(() => calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('LOW-SOURCE', 'LOW')],
  }), /INVALID_TELEMETRY_SOURCE/);
});

test('canonical task binding mismatch and token-budget mismatch both fail closed', async () => {
  const rootDir = await root();
  await overwriteCanonical(rootDir, 'TASK-A', telemetry('TASK-B', 300));
  await assert.rejects(() => calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('TASK-A', 'LOW')],
  }), /TELEMETRY_TASK_MISMATCH/);

  const budgetRoot = await root();
  await store(budgetRoot, 'TASK-BUDGET', 300);
  const alternateBudget = { expected_max: 1100, soft_alert: 2100, hard_cap: 5100 };
  await assert.rejects(() => calibrateCanonicalRiskClasses({
    root_dir: budgetRoot,
    task_contracts: [taskContract('TASK-BUDGET', 'LOW', alternateBudget)],
  }), /CALIBRATION_TOKEN_BUDGET_MISMATCH/);
});

test('duplicate task contracts cannot inflate canonical sample count', async () => {
  const rootDir = await root();
  await store(rootDir, 'LOW-DUP', 250);
  await assert.rejects(() => calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('LOW-DUP', 'LOW'), taskContract('LOW-DUP', 'LOW')],
  }), /DUPLICATE_CALIBRATION_TASK:LOW-DUP/);
});

test('noncanonical in-memory verified telemetry cannot enter statistics', () => {
  const record = telemetry('HIGH-MEMORY', 700);
  const binding = validateCalibrationBinding({
    task_contract: taskContract('HIGH-MEMORY', 'HIGH'),
    telemetry_record: record,
  });
  assert.equal(binding.telemetry_state, 'VERIFIED');
  assert.equal(binding.canonical_readback, false);
});

test('canonical report is defensively frozen and cannot be mutated into recommendations', async () => {
  const rootDir = await root();
  await store(rootDir, 'HIGH-ONE', 700);
  const report = await calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('HIGH-ONE', 'HIGH')],
  });
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.classes.HIGH), true);
  assert.equal(report.policy_mutation_allowed, false);
  assert.throws(() => { report.classes.HIGH.disposition = 'SUFFICIENT_CANONICAL_TELEMETRY'; }, TypeError);
});

test('malformed task ids are not downgraded to missing telemetry', async () => {
  const rootDir = await root();
  await assert.rejects(() => calibrateCanonicalRiskClasses({
    root_dir: rootDir,
    task_contracts: [taskContract('../BAD', 'LOW')],
  }), /INVALID_TASK_ID/);
});
