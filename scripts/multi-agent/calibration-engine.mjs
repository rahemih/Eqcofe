import { isDeepStrictEqual } from 'node:util';
import {
  readTelemetryRecord,
  validateTelemetryRecord,
  validateTokenBudget,
} from './token-telemetry.mjs';

export const CALIBRATION_RISK_CLASSES = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);
export const MIN_PRIMARY_SAMPLES_PER_RISK = 10;

const RISK_SET = new Set(CALIBRATION_RISK_CLASSES);

function fail(code) { throw new Error(code); }
function nonEmpty(value, code) { if (typeof value !== 'string' || value.trim() === '') fail(code); return value.trim(); }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeRisk(value) {
  const risk = nonEmpty(value, 'CALIBRATION_RISK_REQUIRED').toUpperCase();
  if (!RISK_SET.has(risk)) fail(`INVALID_CALIBRATION_RISK:${risk}`);
  return risk;
}

function normalizeTaskContract(contract) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) fail('INVALID_CALIBRATION_TASK_CONTRACT');
  const task_id = nonEmpty(contract.task_id, 'CALIBRATION_TASK_ID_REQUIRED');
  const risk = normalizeRisk(contract.risk);
  const token_budget = validateTokenBudget(contract.token_budget);
  return Object.freeze({ task_id, risk, token_budget });
}

function exclusionReason(record) {
  if (record.human_rejected) return 'HUMAN_REJECTED';
  if (record.terminal_state !== 'MERGED') return 'TERMINAL_STATE_NOT_MERGED';
  return null;
}

export function validateCalibrationBinding(binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) fail('INVALID_CALIBRATION_BINDING');
  const contract = normalizeTaskContract(binding.task_contract);
  const inputRecord = binding.telemetry_record ?? null;

  if (inputRecord === null) {
    return deepFreeze({
      task_id: contract.task_id,
      risk: contract.risk,
      token_budget: contract.token_budget,
      telemetry_state: 'MISSING',
      canonical_readback: false,
      primary_sample: false,
      exclusion_reason: 'MISSING_TELEMETRY',
      total_model_tokens: null,
      provider_authoritative: null,
    });
  }

  const record = validateTelemetryRecord(inputRecord, contract.task_id);
  if (!isDeepStrictEqual(record.token_budget, contract.token_budget)) fail('CALIBRATION_TOKEN_BUDGET_MISMATCH');
  if (record.provenance?.explicit_usage_only !== true) fail('CALIBRATION_EXPLICIT_PROVENANCE_REQUIRED');

  const expectedPrimary = record.terminal_state === 'MERGED' && record.human_rejected === false;
  if (record.calibration_primary_sample !== expectedPrimary) fail('CALIBRATION_PRIMARY_SAMPLE_MISMATCH');

  const total = record.measurements?.total_model_tokens;
  if (!Number.isSafeInteger(total) || total < 0) fail('INVALID_CALIBRATION_TOKEN_TOTAL');

  return deepFreeze({
    task_id: contract.task_id,
    risk: contract.risk,
    token_budget: contract.token_budget,
    telemetry_state: 'VERIFIED',
    canonical_readback: binding.canonical_readback === true,
    primary_sample: expectedPrimary,
    exclusion_reason: expectedPrimary ? null : exclusionReason(record),
    total_model_tokens: total,
    provider_authoritative: record.provenance.provider_authoritative === true,
  });
}

export async function loadCanonicalCalibrationBinding(rootDir, taskContract) {
  const root = nonEmpty(rootDir, 'CALIBRATION_ROOT_REQUIRED');
  const contract = normalizeTaskContract(taskContract);
  let record;
  try {
    record = await readTelemetryRecord(root, contract.task_id);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return validateCalibrationBinding({
        task_contract: contract,
        telemetry_record: null,
        canonical_readback: false,
      });
    }
    throw error;
  }
  return validateCalibrationBinding({
    task_contract: contract,
    telemetry_record: record,
    canonical_readback: true,
  });
}

function nearestRank(sortedValues, percentile) {
  const rank = Math.ceil(percentile * sortedValues.length);
  return sortedValues[Math.max(0, rank - 1)];
}

function tokenQuantiles(primaryBindings) {
  const values = primaryBindings.map((binding) => binding.total_model_tokens).sort((a, b) => a - b);
  return Object.freeze({
    min: values[0],
    p50: nearestRank(values, 0.50),
    p75: nearestRank(values, 0.75),
    p90: nearestRank(values, 0.90),
    max: values.at(-1),
    method: 'NEAREST_RANK',
  });
}

function countReasons(bindings) {
  const counts = {};
  for (const binding of bindings) {
    if (!binding.exclusion_reason) continue;
    counts[binding.exclusion_reason] = (counts[binding.exclusion_reason] ?? 0) + 1;
  }
  return Object.freeze(Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))));
}

function reportForRisk(risk, bindings) {
  const inClass = bindings.filter((binding) => binding.risk === risk).sort((a, b) => a.task_id.localeCompare(b.task_id));
  const canonical = inClass.filter((binding) => binding.telemetry_state !== 'VERIFIED' || binding.canonical_readback === true);
  if (canonical.length !== inClass.length) fail('NON_CANONICAL_TELEMETRY_SOURCE');
  const primary = inClass.filter((binding) => binding.primary_sample);
  const sufficient = primary.length >= MIN_PRIMARY_SAMPLES_PER_RISK;
  return deepFreeze({
    risk,
    disposition: sufficient ? 'SUFFICIENT_CANONICAL_TELEMETRY' : 'INSUFFICIENT_CANONICAL_TELEMETRY',
    minimum_primary_samples: MIN_PRIMARY_SAMPLES_PER_RISK,
    task_count: inClass.length,
    telemetry_record_count: inClass.filter((binding) => binding.telemetry_state === 'VERIFIED').length,
    missing_telemetry_count: inClass.filter((binding) => binding.telemetry_state === 'MISSING').length,
    primary_sample_count: primary.length,
    excluded_sample_count: inClass.length - primary.length,
    exclusion_reasons: countReasons(inClass),
    task_ids: inClass.map((binding) => binding.task_id),
    primary_task_ids: primary.map((binding) => binding.task_id),
    token_quantiles: sufficient ? tokenQuantiles(primary) : null,
  });
}

function calibrateVerifiedBindings(bindings) {
  const seen = new Set();
  for (const binding of bindings) {
    if (seen.has(binding.task_id)) fail(`DUPLICATE_CALIBRATION_TASK:${binding.task_id}`);
    seen.add(binding.task_id);
  }
  const classes = Object.fromEntries(
    CALIBRATION_RISK_CLASSES.map((risk) => [risk, reportForRisk(risk, bindings)]),
  );
  return deepFreeze({
    schema_version: '1.0',
    disposition_rule: 'PER_RISK_CLASS',
    source_rule: 'CANONICAL_TELEMETRY_READBACK_ONLY',
    sample_sufficiency: {
      minimum_primary_samples_per_risk: MIN_PRIMARY_SAMPLES_PER_RISK,
      rule_basis: 'CONSERVATIVE_OPERATIONAL_FLOOR_NOT_STATISTICAL_CONFIDENCE',
      statistics_emitted_only_when_sufficient: true,
    },
    policy_mutation_allowed: false,
    classes,
  });
}

export async function calibrateCanonicalRiskClasses({ root_dir, task_contracts }) {
  const root = nonEmpty(root_dir, 'CALIBRATION_ROOT_REQUIRED');
  if (!Array.isArray(task_contracts)) fail('CALIBRATION_TASK_CONTRACTS_REQUIRED');
  const contracts = task_contracts.map(normalizeTaskContract).sort((a, b) => a.task_id.localeCompare(b.task_id));
  const bindings = [];
  for (const contract of contracts) bindings.push(await loadCanonicalCalibrationBinding(root, contract));
  return calibrateVerifiedBindings(bindings);
}
