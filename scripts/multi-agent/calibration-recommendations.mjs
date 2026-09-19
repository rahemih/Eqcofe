import { CALIBRATION_RISK_CLASSES } from './calibration-engine.mjs';

const DISPOSITIONS = new Set([
  'INSUFFICIENT_CANONICAL_TELEMETRY',
  'SUFFICIENT_CANONICAL_TELEMETRY',
]);

function fail(code) { throw new Error(code); }
function nonNegativeInteger(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateQuantiles(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('TOKEN_QUANTILES_REQUIRED');
  const min = nonNegativeInteger(value.min, 'INVALID_QUANTILE_MIN');
  const p50 = nonNegativeInteger(value.p50, 'INVALID_QUANTILE_P50');
  const p75 = nonNegativeInteger(value.p75, 'INVALID_QUANTILE_P75');
  const p90 = nonNegativeInteger(value.p90, 'INVALID_QUANTILE_P90');
  const max = nonNegativeInteger(value.max, 'INVALID_QUANTILE_MAX');
  if (!(min <= p50 && p50 <= p75 && p75 <= p90 && p90 <= max)) fail('INVALID_QUANTILE_ORDER');
  if (value.method !== 'NEAREST_RANK') fail('UNSUPPORTED_QUANTILE_METHOD');
  return Object.freeze({ min, p50, p75, p90, max, method: 'NEAREST_RANK' });
}

function validateClassReport(risk, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`CALIBRATION_CLASS_REQUIRED:${risk}`);
  if (value.risk !== risk) fail(`CALIBRATION_RISK_MISMATCH:${risk}`);
  if (!DISPOSITIONS.has(value.disposition)) fail(`INVALID_CALIBRATION_DISPOSITION:${risk}`);
  const minimum = nonNegativeInteger(value.minimum_primary_samples, `INVALID_MINIMUM_SAMPLES:${risk}`);
  const primary = nonNegativeInteger(value.primary_sample_count, `INVALID_PRIMARY_SAMPLES:${risk}`);
  const missing = nonNegativeInteger(value.missing_telemetry_count, `INVALID_MISSING_TELEMETRY_COUNT:${risk}`);
  const excluded = nonNegativeInteger(value.excluded_sample_count, `INVALID_EXCLUDED_SAMPLE_COUNT:${risk}`);
  const sufficient = value.disposition === 'SUFFICIENT_CANONICAL_TELEMETRY';
  if (sufficient && primary < minimum) fail(`SUFFICIENCY_COUNT_MISMATCH:${risk}`);
  if (!sufficient && primary >= minimum) fail(`INSUFFICIENCY_COUNT_MISMATCH:${risk}`);
  if (sufficient && value.token_quantiles === null) fail(`SUFFICIENT_QUANTILES_MISSING:${risk}`);
  if (!sufficient && value.token_quantiles !== null) fail(`INSUFFICIENT_QUANTILES_PRESENT:${risk}`);
  const token_quantiles = sufficient ? validateQuantiles(value.token_quantiles) : null;
  return Object.freeze({
    risk,
    disposition: value.disposition,
    minimum,
    primary,
    missing,
    excluded,
    token_quantiles,
  });
}

function tokenBudgetRecommendation(classReport) {
  if (classReport.disposition !== 'SUFFICIENT_CANONICAL_TELEMETRY') {
    return Object.freeze({
      status: 'NO_NUMERIC_RECOMMENDATION',
      candidate: null,
      reason: 'INSUFFICIENT_CANONICAL_TELEMETRY',
    });
  }

  const { p75, p90, max } = classReport.token_quantiles;
  const expected_max = Math.max(1, p75);
  const soft_alert = Math.max(p90, expected_max + 1);
  const hard_cap = Math.max(max + 1, soft_alert + 1);

  return Object.freeze({
    status: 'ADVISORY_CANDIDATE_REQUIRES_SEPARATE_GOVERNANCE',
    candidate: Object.freeze({ expected_max, soft_alert, hard_cap }),
    reason: 'SUFFICIENT_CANONICAL_TOKEN_DISTRIBUTION',
    derivation: 'expected=P75; soft=max(P90,expected+1); hard=max(MAX+1,soft+1)',
  });
}

function retryRepairRecommendation() {
  return Object.freeze({
    status: 'NO_NUMERIC_RECOMMENDATION',
    candidate: null,
    reason: 'RETRY_REPAIR_DISTRIBUTION_NOT_IN_CALIBRATION_REPORT',
  });
}

function processFrictionRecommendations(classReport) {
  const items = [];
  const sample_gap = Math.max(0, classReport.minimum - classReport.primary);

  if (sample_gap > 0) {
    items.push({ action: 'COLLECT_CANONICAL_PRIMARY_SAMPLES', remaining: sample_gap });
  }
  if (classReport.missing > 0) {
    items.push({ action: 'CAPTURE_EXPLICIT_TELEMETRY', affected_tasks: classReport.missing });
  }
  if (classReport.excluded > 0) {
    items.push({ action: 'REVIEW_EXCLUSION_CAUSES', affected_tasks: classReport.excluded });
  }
  if (classReport.disposition === 'SUFFICIENT_CANONICAL_TELEMETRY') {
    items.push({ action: 'REVIEW_TOKEN_CANDIDATE_IN_SEPARATE_GOVERNANCE_TASK' });
  }
  items.push({ action: 'KEEP_EXISTING_RISK_AND_GATE_POLICY' });

  return deepFreeze(items);
}

export function buildCalibrationRecommendations(calibrationReport) {
  if (!calibrationReport || typeof calibrationReport !== 'object' || Array.isArray(calibrationReport)) {
    fail('INVALID_CALIBRATION_REPORT');
  }
  if (calibrationReport.schema_version !== '1.0') fail('UNSUPPORTED_CALIBRATION_SCHEMA');
  if (calibrationReport.source_rule !== 'CANONICAL_TELEMETRY_READBACK_ONLY') {
    fail('NON_CANONICAL_CALIBRATION_REPORT');
  }
  if (calibrationReport.policy_mutation_allowed !== false) {
    fail('CALIBRATION_REPORT_MUST_BE_NON_MUTATING');
  }
  if (!calibrationReport.classes || typeof calibrationReport.classes !== 'object' || Array.isArray(calibrationReport.classes)) {
    fail('CALIBRATION_CLASSES_REQUIRED');
  }

  const recommendations = {};
  for (const risk of CALIBRATION_RISK_CLASSES) {
    const classReport = validateClassReport(risk, calibrationReport.classes[risk]);
    recommendations[risk] = deepFreeze({
      risk,
      evidence: {
        primary_sample_count: classReport.primary,
        minimum_primary_samples: classReport.minimum,
        sample_gap: Math.max(0, classReport.minimum - classReport.primary),
        missing_telemetry_count: classReport.missing,
        excluded_sample_count: classReport.excluded,
      },
      token_budget: tokenBudgetRecommendation(classReport),
      retry_repair: retryRepairRecommendation(),
      risk_and_gates: {
        status: 'NO_CHANGE',
        reason: 'ITEM9_RECOMMENDATIONS_CANNOT_RELAX_RISK_OR_GATES',
        separate_governance_task_required: true,
      },
      process_friction: processFrictionRecommendations(classReport),
    });
  }

  return deepFreeze({
    schema_version: '1.0',
    automatic_apply: false,
    policy_mutation_allowed: false,
    separate_governance_task_required: true,
    all_classes_insufficient: CALIBRATION_RISK_CLASSES.every(
      (risk) => recommendations[risk].token_budget.status === 'NO_NUMERIC_RECOMMENDATION',
    ),
    recommendations,
  });
}
