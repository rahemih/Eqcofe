import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalibrationRecommendations } from '../../scripts/multi-agent/calibration-recommendations.mjs';

function classReport(
  risk,
  { primary = 0, minimum = 10, missing = 0, excluded = 0, quantiles = null } = {},
) {
  const sufficient = primary >= minimum;
  return {
    risk,
    disposition: sufficient ? 'SUFFICIENT_CANONICAL_TELEMETRY' : 'INSUFFICIENT_CANONICAL_TELEMETRY',
    minimum_primary_samples: minimum,
    primary_sample_count: primary,
    missing_telemetry_count: missing,
    excluded_sample_count: excluded,
    token_quantiles: sufficient
      ? (quantiles ?? {
        min: 100,
        p50: 200,
        p75: 300,
        p90: 400,
        max: 500,
        method: 'NEAREST_RANK',
      })
      : null,
  };
}

function report(overrides = {}) {
  return {
    schema_version: '1.0',
    source_rule: 'CANONICAL_TELEMETRY_READBACK_ONLY',
    policy_mutation_allowed: false,
    classes: {
      LOW: classReport('LOW', overrides.LOW),
      MEDIUM: classReport('MEDIUM', overrides.MEDIUM),
      HIGH: classReport('HIGH', overrides.HIGH),
    },
  };
}

test('current insufficient evidence yields no numeric recommendations for all risk classes', () => {
  const result = buildCalibrationRecommendations(report({
    LOW: { missing: 1 },
    MEDIUM: { missing: 1 },
    HIGH: { missing: 1 },
  }));

  assert.equal(result.all_classes_insufficient, true);
  for (const risk of ['LOW', 'MEDIUM', 'HIGH']) {
    assert.equal(result.recommendations[risk].token_budget.status, 'NO_NUMERIC_RECOMMENDATION');
    assert.equal(result.recommendations[risk].token_budget.candidate, null);
    assert.equal(result.recommendations[risk].retry_repair.status, 'NO_NUMERIC_RECOMMENDATION');
    assert.equal(result.recommendations[risk].risk_and_gates.status, 'NO_CHANGE');
    assert.equal(result.recommendations[risk].evidence.sample_gap, 10);
  }
});

test('process friction is derived only from visible sample, missing and exclusion counts', () => {
  const result = buildCalibrationRecommendations(report({
    LOW: { primary: 4, minimum: 10, missing: 2, excluded: 3 },
  }));

  assert.deepEqual(result.recommendations.LOW.process_friction, [
    { action: 'COLLECT_CANONICAL_PRIMARY_SAMPLES', remaining: 6 },
    { action: 'CAPTURE_EXPLICIT_TELEMETRY', affected_tasks: 2 },
    { action: 'REVIEW_EXCLUSION_CAUSES', affected_tasks: 3 },
    { action: 'KEEP_EXISTING_RISK_AND_GATE_POLICY' },
  ]);
});

test('sufficient canonical token evidence emits advisory budget candidate with strict ordering', () => {
  const result = buildCalibrationRecommendations(report({
    LOW: {
      primary: 10,
      quantiles: {
        min: 100,
        p50: 200,
        p75: 300,
        p90: 400,
        max: 500,
        method: 'NEAREST_RANK',
      },
    },
  }));

  assert.deepEqual(result.recommendations.LOW.token_budget.candidate, {
    expected_max: 300,
    soft_alert: 400,
    hard_cap: 501,
  });
  assert.equal(
    result.recommendations.LOW.token_budget.status,
    'ADVISORY_CANDIDATE_REQUIRES_SEPARATE_GOVERNANCE',
  );
  assert.equal(result.automatic_apply, false);
});

test('equal observed quantiles are normalized minimally to a valid strict budget order', () => {
  const result = buildCalibrationRecommendations(report({
    MEDIUM: {
      primary: 10,
      quantiles: {
        min: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        max: 0,
        method: 'NEAREST_RANK',
      },
    },
  }));

  assert.deepEqual(result.recommendations.MEDIUM.token_budget.candidate, {
    expected_max: 1,
    soft_alert: 2,
    hard_cap: 3,
  });
});

test('retry and repair envelope never receives a fabricated numeric recommendation', () => {
  const result = buildCalibrationRecommendations(report({ HIGH: { primary: 10 } }));
  assert.deepEqual(result.recommendations.HIGH.retry_repair, {
    status: 'NO_NUMERIC_RECOMMENDATION',
    candidate: null,
    reason: 'RETRY_REPAIR_DISTRIBUTION_NOT_IN_CALIBRATION_REPORT',
  });
});

test('risk and gates are never relaxed even when token evidence is sufficient', () => {
  const result = buildCalibrationRecommendations(report({ HIGH: { primary: 10 } }));
  assert.deepEqual(result.recommendations.HIGH.risk_and_gates, {
    status: 'NO_CHANGE',
    reason: 'ITEM9_RECOMMENDATIONS_CANNOT_RELAX_RISK_OR_GATES',
    separate_governance_task_required: true,
  });
});

test('invalid quantile order fails closed', () => {
  assert.throws(
    () => buildCalibrationRecommendations(report({
      LOW: {
        primary: 10,
        quantiles: {
          min: 100,
          p50: 200,
          p75: 500,
          p90: 400,
          max: 600,
          method: 'NEAREST_RANK',
        },
      },
    })),
    /INVALID_QUANTILE_ORDER/,
  );
});

test('noncanonical calibration source and mutating report both fail closed', () => {
  assert.throws(
    () => buildCalibrationRecommendations({ ...report(), source_rule: 'IN_MEMORY' }),
    /NON_CANONICAL_CALIBRATION_REPORT/,
  );
  assert.throws(
    () => buildCalibrationRecommendations({ ...report(), policy_mutation_allowed: true }),
    /CALIBRATION_REPORT_MUST_BE_NON_MUTATING/,
  );
});

test('sufficiency disposition must agree with primary sample count', () => {
  const bad = report();
  bad.classes.LOW = {
    ...bad.classes.LOW,
    disposition: 'SUFFICIENT_CANONICAL_TELEMETRY',
    token_quantiles: {
      min: 1,
      p50: 1,
      p75: 1,
      p90: 1,
      max: 1,
      method: 'NEAREST_RANK',
    },
  };
  assert.throws(() => buildCalibrationRecommendations(bad), /SUFFICIENCY_COUNT_MISMATCH:LOW/);
});

test('recommendation output is deeply frozen and non-applying', () => {
  const result = buildCalibrationRecommendations(report());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.recommendations.LOW), true);
  assert.equal(result.automatic_apply, false);
  assert.equal(result.policy_mutation_allowed, false);
  assert.throws(() => { result.recommendations.LOW.risk = 'HIGH'; }, TypeError);
});
