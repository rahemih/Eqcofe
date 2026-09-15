import { normalizeRepoPath, pathMatchesScope, normalizeScopePattern } from './scope-lock-controller.mjs';

const RISK_ORDER = Object.freeze({ LOW: 0, MEDIUM: 1, HIGH: 2 });
const RISK_VALUES = Object.freeze(Object.keys(RISK_ORDER));
const GATE_STATUSES = new Set(['PASS', 'FAIL', 'NOT_EXECUTED']);
const VERIFICATION_RULE_SOURCES = new Set(['FILE_TYPE', 'MODULE', 'SENSITIVE_ZONE']);

function assertArray(value, code) {
  if (!Array.isArray(value)) throw new Error(code);
  return value;
}

function assertNonEmptyString(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
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
  const path = normalizeScopePattern(zone.path);
  const minimum_risk = normalizeRisk(zone.minimum_risk);
  const reason = typeof zone.reason === 'string' && zone.reason.trim() !== '' ? zone.reason.trim() : 'unspecified';
  return Object.freeze({ path, minimum_risk, reason });
}

function normalizeChangedPaths(changed_paths) {
  return [...new Set(assertArray(changed_paths, 'CHANGED_PATHS_REQUIRED').map(normalizeRepoPath))].sort();
}

export function deterministicRiskFloor({ changed_paths, sensitive_zones = [] }) {
  const changed = normalizeChangedPaths(changed_paths);
  const zones = assertArray(sensitive_zones, 'INVALID_SENSITIVE_ZONES').map(normalizeSensitiveZone);
  const matched_zones = [];

  for (const zone of zones) {
    const matched_paths = changed.filter((file) => pathMatchesScope(file, zone.path));
    if (matched_paths.length > 0) matched_zones.push({ ...zone, matched_paths });
  }

  matched_zones.sort((a, b) => a.path.localeCompare(b.path));
  const floor = maxRisk('LOW', ...matched_zones.map((zone) => zone.minimum_risk));
  return deepFreeze({ floor, matched_zones });
}

function normalizeTaskRiskRule(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw new Error('INVALID_TASK_RISK_RULE');
  const id = assertNonEmptyString(rule.id, 'TASK_RISK_RULE_ID_REQUIRED');
  const risk = normalizeRisk(rule.risk);
  const paths = [...new Set(assertArray(rule.paths, 'TASK_RISK_RULE_PATHS_REQUIRED').map(normalizeScopePattern))].sort();
  if (paths.length === 0) throw new Error('TASK_RISK_RULE_PATHS_REQUIRED');
  return { id, risk, paths };
}

export function detectTaskRisk({ changed_paths, task_risk_rules = [] }) {
  const changed = normalizeChangedPaths(changed_paths);
  const rules = assertArray(task_risk_rules, 'INVALID_TASK_RISK_RULES').map(normalizeTaskRiskRule);
  const matched_rules = [];

  for (const rule of rules) {
    const matched_paths = changed.filter((file) => rule.paths.some((pattern) => pathMatchesScope(file, pattern)));
    if (matched_paths.length > 0) matched_rules.push({ ...rule, matched_paths });
  }

  matched_rules.sort((a, b) => a.id.localeCompare(b.id));
  const detected_risk = maxRisk('LOW', ...matched_rules.map((rule) => rule.risk));
  return deepFreeze({ detected_risk, matched_rules });
}

export function classifyRisk({
  changed_paths,
  sensitive_zones = [],
  task_risk_rules = [],
  manager_risk = 'LOW',
}) {
  const manager = normalizeRisk(manager_risk);
  const floorResult = deterministicRiskFloor({ changed_paths, sensitive_zones });
  const taskResult = detectTaskRisk({ changed_paths, task_risk_rules });
  const deterministic_minimum_risk = maxRisk(floorResult.floor, taskResult.detected_risk);
  const rejected_downgrade = RISK_ORDER[manager] < RISK_ORDER[deterministic_minimum_risk];
  const effective_risk = maxRisk(deterministic_minimum_risk, manager);
  const governance_events = rejected_downgrade ? [{
    type: 'MANAGER_DOWNGRADE_REJECTED',
    attempted_risk: manager,
    minimum_risk: deterministic_minimum_risk,
    effective_risk,
  }] : [];

  return deepFreeze({
    risk_floor: floorResult.floor,
    deterministic_floor: floorResult.floor,
    detected_risk: taskResult.detected_risk,
    deterministic_minimum_risk,
    manager_risk: manager,
    effective_risk,
    rejected_downgrade,
    governance_events,
    human_gate_required: effective_risk === 'HIGH',
    matched_zones: floorResult.matched_zones,
    matched_task_risk_rules: taskResult.matched_rules,
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

function normalizeCheckName(value) {
  return assertNonEmptyString(value, 'INVALID_CHECK_NAME');
}

function inferFileTypes(paths) {
  const types = new Set();
  for (const file of paths) {
    const name = file.split('/').at(-1);
    const index = name.lastIndexOf('.');
    types.add(index > 0 ? name.slice(index).toLowerCase() : '<none>');
  }
  return [...types].sort();
}

function inferModules(paths) {
  return [...new Set(paths.map((file) => file.match(/^src\/modules\/([^/]+)/)?.[1]).filter(Boolean))].sort();
}

function normalizeVerificationRule(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw new Error('INVALID_VERIFICATION_RULE');
  const id = assertNonEmptyString(rule.id, 'VERIFICATION_RULE_ID_REQUIRED');
  const source = assertNonEmptyString(rule.source, 'VERIFICATION_RULE_SOURCE_REQUIRED').toUpperCase();
  if (!VERIFICATION_RULE_SOURCES.has(source)) throw new Error(`INVALID_VERIFICATION_RULE_SOURCE:${source}`);
  const match = assertNonEmptyString(rule.match, 'VERIFICATION_RULE_MATCH_REQUIRED');
  const required_checks = [...new Set(assertArray(rule.required_checks, 'VERIFICATION_RULE_CHECKS_REQUIRED').map(normalizeCheckName))].sort();
  if (required_checks.length === 0) throw new Error('VERIFICATION_RULE_CHECKS_REQUIRED');
  return { id, source, match, required_checks };
}

function normalizeAcceptanceCriteria(criteria) {
  const ids = new Set();
  return assertArray(criteria, 'INVALID_ACCEPTANCE_CRITERIA').map((criterion) => {
    if (!criterion || typeof criterion !== 'object' || Array.isArray(criterion)) throw new Error('INVALID_ACCEPTANCE_CRITERION');
    const id = assertNonEmptyString(criterion.id, 'AC_ID_REQUIRED');
    if (ids.has(id)) throw new Error(`DUPLICATE_AC_ID:${id}`);
    ids.add(id);
    const verification = assertNonEmptyString(criterion.verification, 'AC_VERIFICATION_REQUIRED');
    if (typeof criterion.mandatory !== 'boolean') throw new Error('AC_MANDATORY_REQUIRED');
    return { id, verification, mandatory: criterion.mandatory };
  });
}

export function deriveVerificationPolicy({
  risk,
  changed_paths,
  sensitive_zones = [],
  acceptance_criteria = [],
  verification_rules = [],
  reviewer_additions = [],
  reviewer_removals = [],
}) {
  const normalizedRisk = normalizeRisk(risk);
  const paths = normalizeChangedPaths(changed_paths);
  const file_types = inferFileTypes(paths);
  const modules = inferModules(paths);
  const floorResult = deterministicRiskFloor({ changed_paths: paths, sensitive_zones });
  const criteria = normalizeAcceptanceCriteria(acceptance_criteria);
  const rules = assertArray(verification_rules, 'INVALID_VERIFICATION_RULES').map(normalizeVerificationRule);
  const riskPolicy = verificationPolicyForRisk(normalizedRisk);

  const deterministic = new Set(riskPolicy.required_gates);
  const matched_rules = [];

  for (const rule of rules) {
    const matches = rule.source === 'FILE_TYPE'
      ? file_types.includes(rule.match.toLowerCase())
      : rule.source === 'MODULE'
        ? modules.includes(rule.match)
        : floorResult.matched_zones.some((zone) => zone.path === rule.match || zone.reason === rule.match);
    if (!matches) continue;
    matched_rules.push(rule);
    for (const check of rule.required_checks) deterministic.add(check);
  }

  for (const criterion of criteria) {
    if (criterion.mandatory) deterministic.add(criterion.verification);
  }

  const deterministic_required_checks = [...deterministic].sort();
  const deterministicSet = new Set(deterministic_required_checks);
  const additions = [...new Set(assertArray(reviewer_additions, 'INVALID_REVIEWER_ADDITIONS').map(normalizeCheckName))].sort();
  const removals = [...new Set(assertArray(reviewer_removals, 'INVALID_REVIEWER_REMOVALS').map(normalizeCheckName))].sort();

  for (const check of removals) {
    if (deterministicSet.has(check)) throw new Error(`REVIEWER_CANNOT_REMOVE_DETERMINISTIC_CHECK:${check}`);
  }

  const reviewer_added_checks = additions.filter((check) => !deterministicSet.has(check));
  const manager_decisions_required = removals.map((check) => ({
    type: 'OPTIONAL_CHECK_REMOVAL_REQUIRES_MANAGER',
    check,
  }));
  const required_checks = [...new Set([...deterministic_required_checks, ...reviewer_added_checks])].sort();

  return deepFreeze({
    risk: normalizedRisk,
    required_gates: riskPolicy.required_gates,
    human_gate_required: riskPolicy.human_gate_required,
    deterministic_required_checks,
    reviewer_added_checks,
    required_checks,
    source: {
      risk_level: normalizedRisk,
      changed_file_types: file_types,
      changed_modules: modules,
      sensitive_zones: floorResult.matched_zones.map((zone) => ({ path: zone.path, reason: zone.reason })),
      acceptance_criteria: criteria.filter((criterion) => criterion.mandatory).map((criterion) => criterion.id),
      matched_verification_rules: matched_rules.map((rule) => rule.id).sort(),
    },
    manager_decisions_required,
  });
}

function normalizeGateStatus(value, gate) {
  const status = value ?? 'NOT_EXECUTED';
  if (typeof status !== 'string' || !GATE_STATUSES.has(status)) throw new Error(`INVALID_GATE_STATUS:${gate}`);
  return status;
}

export function evaluateRequiredChecks({ policy, statuses = {} }) {
  if (!policy || typeof policy !== 'object' || !Array.isArray(policy.required_checks)) throw new Error('INVALID_VERIFICATION_POLICY');
  if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) throw new Error('INVALID_CHECK_STATUSES');
  const check_statuses = {};
  const blockers = [];
  for (const check of policy.required_checks) {
    const status = normalizeGateStatus(statuses[check], check);
    check_statuses[check] = status;
    if (status !== 'PASS') blockers.push({ check, status });
  }
  return deepFreeze({
    required_checks: [...policy.required_checks],
    check_statuses,
    blockers,
    verification_passed: blockers.length === 0,
  });
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
