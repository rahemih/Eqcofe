import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTelemetryRecord } from '../../scripts/multi-agent/token-telemetry.mjs';
import {
  CALIBRATION_RISK_CLASSES,
  MIN_PRIMARY_SAMPLES_PER_RISK,
  calibrateRiskClasses,
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

function binding(task_id, risk, total, options = {}) {
  return {
    task_contract: taskContract(task_id, risk, options.contract_budget ?? budget),
    telemetry_record: options.missing ? null : telemetry(task_id, total, options),
  };
}

test('risk classes and minimum primary sample floor are frozen and deterministic', () => {
  assert.deepEqual(CALIBRATION_RISK_CLASSES, ['LOW', 'MEDIUM', 'HIGH']);
  assert.equal(MIN_PRIMARY_SAMPLES_PER_RISK, 10);
  assert.equal(Object.isFrozen(CALIBRATION_RISK_CLASSES), true);
});

test('missing telemetry is explicit and never converted into zero usage', () => {
  const report = calibrateRiskClasses([
    binding('LOW-MISSING', 'LOW', 0, { missing: true }),
    binding('MEDIUM-MISSING', 'MEDIUM', 0, { missing: true }),
    binding('HIGH-MISSING', 'HIGH', 0, { missing: true }),
  ]);
  for (const risk of CALIBRATION_RISK_CLASSES) {
    assert.equal(report.classes[risk].disposition, 'INSUFFICIENT_CANONICAL_TELEMETRY');
    assert.equal(report.classes[risk].primary_sample_count, 0);
    assert.equal(report.classes[risk].missing_telemetry_count, 1);
    assert.equal(report.classes[risk].token_quantiles, null);
  }
  assert.equal(report.policy_mutation_allowed, false);
});

test('one successful pilot remains insufficient and cannot emit percentile statistics', () => {
  const report = calibrateRiskClasses([binding('LOW-ONE', 'LOW', 400)]);
  assert.equal(report.classes.LOW.primary_sample_count, 1);
  assert.equal(report.classes.LOW.disposition, 'INSUFFICIENT_CANONICAL_TELEMETRY');
  assert.equal(report.classes.LOW.token_quantiles, null);
});

test('exactly ten primary samples unlock deterministic nearest-rank quantiles only for that risk class', () => {
  const samples = Array.from({ length: 10 }, (_, index) => binding(`LOW-${index + 1}`, 'LOW', (index + 1) * 10));
  const report = calibrateRiskClasses(samples);
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

test('human-rejected and non-merged records are retained as evidence but excluded from primary samples', () => {
  const report = calibrateRiskClasses([
    binding('MED-REJECTED', 'MEDIUM', 300, { human_rejected: true }),
    binding('MED-ABORTED', 'MEDIUM', 350, { terminal_state: 'ABORTED' }),
  ]);
  assert.equal(report.classes.MEDIUM.primary_sample_count, 0);
  assert.equal(report.classes.MEDIUM.excluded_sample_count, 2);
  assert.deepEqual(report.classes.MEDIUM.exclusion_reasons, {
    HUMAN_REJECTED: 1,
    TERMINAL_STATE_NOT_MERGED: 1,
  });
  assert.equal(report.classes.MEDIUM.token_quantiles, null);
});

test('tampered aggregate fails closed instead of becoming a calibration sample', () => {
  const record = telemetry('LOW-TAMPER', 400);
  const tampered = { ...record, measurements: { ...record.measurements, total_model_tokens: 1 } };
  assert.throws(() => validateCalibrationBinding({
    task_contract: taskContract('LOW-TAMPER', 'LOW'),
    telemetry_record: tampered,
  }), /TELEMETRY_RECORD_INTEGRITY_MISMATCH/);
});

test('invalid provenance fails closed through canonical telemetry validation', () => {
  const record = telemetry('LOW-SOURCE', 400);
  const tampered = { ...record, events: record.events.map((event) => ({ ...event, source: 'SYNTHETIC' })) };
  assert.throws(() => validateCalibrationBinding({
    task_contract: taskContract('LOW-SOURCE', 'LOW'),
    telemetry_record: tampered,
  }), /INVALID_TELEMETRY_SOURCE/);
});

test('task binding mismatch and token-budget mismatch both fail closed', () => {
  assert.throws(() => validateCalibrationBinding({
    task_contract: taskContract('TASK-A', 'LOW'),
    telemetry_record: telemetry('TASK-B', 300),
  }), /TELEMETRY_TASK_MISMATCH/);

  const alternateBudget = { expected_max: 1100, soft_alert: 2100, hard_cap: 5100 };
  assert.throws(() => validateCalibrationBinding({
    task_contract: taskContract('TASK-BUDGET', 'LOW', alternateBudget),
    telemetry_record: telemetry('TASK-BUDGET', 300),
  }), /CALIBRATION_TOKEN_BUDGET_MISMATCH/);
});

test('duplicate task ids cannot inflate sample count', () => {
  const sample = binding('LOW-DUP', 'LOW', 250);
  assert.throws(() => calibrateRiskClasses([sample, sample]), /DUPLICATE_CALIBRATION_TASK:LOW-DUP/);
});

test('reports are defensively frozen and cannot be mutated into recommendations', () => {
  const report = calibrateRiskClasses([binding('HIGH-ONE', 'HIGH', 700)]);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.classes.HIGH), true);
  assert.equal(report.policy_mutation_allowed, false);
  assert.throws(() => { report.classes.HIGH.disposition = 'SUFFICIENT_CANONICAL_TELEMETRY'; }, TypeError);
});
