import { normalizeRepoPath, pathMatchesScope } from './scope-lock-controller.mjs';

const RISK_ORDER = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2 });
const RISK_VALUES = Object.freeze(Object.keys(RISK_ORDER));
const GATE_STATUSES = new Set(['PASS', 'FAIL', 'NOT_EXECUTED']);

function assertArray(value, code) {
  if (!Array.isArray(value)) throw new Error(code);
  return value;
}

export function normalizeRisk(value) {
  if (typeof value !== 'string') throw new Error('INVALID_RISK');
  const normalized = value.trim().toUpperCase();
  if (!Object.hasOwn(RISK_ORDER, normalized)) throw new Error(`INVALID_RISK:${value}`);
  return normalized;
}

export function maxRisk(...values) {
  if (values.length === 0) return 'LOW';
  return values.map(normalizeRisk).reduce((highest, current) => (
    RISK_ORDER[current] > RISK_ORDER[highest] ? current : highest
  ), 'LOW');
}

function normalizeSensitiveZone(zone) {
  if (!zone || typeof zone !== 'object') throw new Error('INVALID_SENSITIVE_ZONE');
  if (typeof zone.path !== 'string' || zone.path.trim() === '') throw new Error('SENSITIVE_ZONE_PATH_REQUIRED');
  const minimum_risk = normalizeRisk(zone.minimum_risk);
  const reason = typeof zone.reason === 'string' && zone.reason.trim() !== '' ? zone.reason.trim() : 'unspecified';
  return Object.freeze({ path: zone.path.trim(), minimum_risk, reason });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function deterministicRiskFloor({ changed_paths, sensitive_zones = [] }) {
  const changed = [...new Set(assertArray(changed_paths, 'CHANGED_PATHS_REQUIRED').map(normalizeRepoPath))].sort();
  const zones = assertArray(sensitive_zones, 'INVALID_SENSITIVE_ZONES').map(normalizeSensitiveZone);
  const matched_zones = [];

  for (const zone of zones) {
    const matched_paths = changed.filter((file) => pathMatchesScope(file, zone.path));
    if (matched_paths.length > 0) {
      matched_zones.push({ ...zone, matched_paths });
    }
  }

  matched_zones.sort((a, b) => a.path.localeCompare(b.path));
  const floor = maxRisk('LOW', ...matched_zones.map((zone) => zone.minimum_risk));
  return deepFreeze({ floor, matched_zones });
}

export function classifyRisk({ changed_paths, sensitive_zones = [], manager_risk = 'LOW' }) {
  const manager = normalizeRisk(manager_risk);
  const deterministic = deterministicRiskFloor({ changed_paths, sensitive_zones });
  const rejected_downgrade = RISK_ORDER[manager] < RISK_ORDER[deterministic.floor];
  const effective_risk = maxRisk(deterministic.floor, manager);
  const governance_events = rejected_downgrade ? [{
    type: 'MANAGER_DOWNGRADE_REJECTED',
    attempted_risk: manager,
    minimum_risk: deterministic.floor,
    effective_risk,
  }] : [];

  return deepFreeze({
    deterministic_floor: deterministic.floor,
    manager_risk: manager,
    effective_risk,
    rejected_downgrade,
    governance_events,
    human_gate_required: effective_risk === 'HIGH',
    matched_zones: deterministic.matched_zones,
  });
}

const VERIFICATION_POLICY = Object.freeze({
  LOW: Object.freeze({
    required_gates: Object.freeze(['verification']),
    reviewer_required: false,
    verification_required: true,
    security_required: false,
    human_gate_required: false,
  }),
  MEDIUM: Object.freeze({
    required_gates: Object.freeze(['review', 'verification']),
    reviewer_required: true,
    verification_required: true,
    security_required: false,
    human_gate_required: false,
  }),
  HIGH: Object.freeze({
    required_gates: Object.freeze(['review', 'verification', 'security']),
    reviewer_required: true,
    verification_required: true,
    security_required: true,
    human_gate_required: true,
  }),
});

export function verificationPolicyForRisk(risk) {
  const normalized = normalizeRisk(risk);
  return deepFreeze(structuredClone(VERIFICATION_POLICY[normalized]));
}

function normalizeGateStatus(value, gate) {
  const status = value ?? 'NOT_EXECUTED';
  if (typeof status !== 'string' || !GATE_STATUSES.has(status)) {
    throw new Error(`INVALID_GATE_STATUS:${gate}`);
  }
  return status;
}

export function evaluateVerification({ risk, gates = {} }) {
  if (!gates || typeof gates !== 'object' || Array.isArray(gates)) throw new Error('INVALID_GATES');
  const policy = verificationPolicyForRisk(risk);
  const gate_statuses = {};
  const blockers = [];

  for (const gate of policy.required_gates) {
    const status = normalizeGateStatus(gates[gate], gate);
    gate_statuses[gate] = status;
    if (status !== 'PASS') blockers.push({ gate, status });
  }

  return deepFreeze({
    risk: normalizeRisk(risk),
    required_gates: policy.required_gates,
    human_gate_required: policy.human_gate_required,
    gate_statuses,
    blockers,
    verification_passed: blockers.length === 0,
  });
}

export { RISK_VALUES };
