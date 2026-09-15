import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RISK_VALUES,
  normalizeRisk,
  maxRisk,
  deterministicRiskFloor,
  detectTaskRisk,
  classifyRisk,
  verificationPolicyForRisk,
  deriveVerificationPolicy,
  evaluateRequiredChecks,
  evaluateVerification,
} from '../../scripts/multi-agent/risk-verification-policy.mjs';

const sensitiveZones = [
  { path: 'src/modules/payment/**', minimum_risk: 'HIGH', reason: 'payment_processing' },
  { path: 'src/modules/auth/**', minimum_risk: 'HIGH', reason: 'authentication_authorization' },
  { path: 'src/modules/pricing/**', minimum_risk: 'HIGH', reason: 'pricing' },
  { path: 'src/modules/inventory/**', minimum_risk: 'HIGH', reason: 'inventory_reservation' },
  { path: 'database/migrations/**', minimum_risk: 'HIGH', reason: 'database_migration' },
];

test('risk values normalize deterministically and invalid risk fails closed', () => {
  assert.deepEqual(RISK_VALUES, ['LOW', 'MEDIUM', 'HIGH']);
  assert.equal(normalizeRisk(' medium '), 'MEDIUM');
  assert.throws(() => normalizeRisk('critical'), /INVALID_RISK/);
  assert.throws(() => normalizeRisk(null), /INVALID_RISK/);
});

test('max risk rule is deterministic and can only select the highest input', () => {
  assert.equal(maxRisk(), 'LOW');
  assert.equal(maxRisk('LOW', 'MEDIUM'), 'MEDIUM');
  assert.equal(maxRisk('HIGH', 'LOW', 'MEDIUM'), 'HIGH');
});

test('deterministic task-risk rules produce detected_risk independently of sensitive floor', () => {
  const detected = detectTaskRisk({
    changed_paths: ['scripts/multi-agent/tool.mjs'],
    task_risk_rules: [{ id: 'RULE-GOV', risk: 'MEDIUM', paths: ['scripts/multi-agent/**'] }],
  });
  assert.equal(detected.detected_risk, 'MEDIUM');
  assert.equal(detected.matched_rules[0].id, 'RULE-GOV');

  const classified = classifyRisk({
    changed_paths: ['scripts/multi-agent/tool.mjs'],
    sensitive_zones: sensitiveZones,
    task_risk_rules: [{ id: 'RULE-GOV', risk: 'MEDIUM', paths: ['scripts/multi-agent/**'] }],
    manager_risk: 'MEDIUM',
  });
  assert.equal(classified.risk_floor, 'LOW');
  assert.equal(classified.detected_risk, 'MEDIUM');
  assert.equal(classified.deterministic_minimum_risk, 'MEDIUM');
  assert.equal(classified.effective_risk, 'MEDIUM');
});

test('classification order uses MAX(detected_risk, risk_floor) before Manager input', () => {
  const result = classifyRisk({
    changed_paths: ['src/modules/payment/refund.ts'],
    sensitive_zones: sensitiveZones,
    task_risk_rules: [{ id: 'RULE-PAYMENT-DOC', risk: 'MEDIUM', paths: ['src/modules/payment/**'] }],
    manager_risk: 'LOW',
  });
  assert.equal(result.risk_floor, 'HIGH');
  assert.equal(result.detected_risk, 'MEDIUM');
  assert.equal(result.deterministic_minimum_risk, 'HIGH');
  assert.equal(result.effective_risk, 'HIGH');
  assert.equal(result.rejected_downgrade, true);
});

test('Q-1 payment path triggers HIGH floor regardless of lower manager input', () => {
  const result = classifyRisk({
    changed_paths: ['src/modules/payment/refund.ts'],
    sensitive_zones: sensitiveZones,
    manager_risk: 'LOW',
  });
  assert.equal(result.deterministic_floor, 'HIGH');
  assert.equal(result.effective_risk, 'HIGH');
  assert.equal(result.human_gate_required, true);
  assert.equal(result.matched_zones[0].path, 'src/modules/payment/**');
});

test('Q-2 multiple sensitive zones yield the maximum deterministic floor', () => {
  const result = deterministicRiskFloor({
    changed_paths: [
      'src/modules/payment/refund.ts',
      'src/modules/cart/items.ts',
    ],
    sensitive_zones: [
      ...sensitiveZones,
      { path: 'src/modules/cart/**', minimum_risk: 'MEDIUM', reason: 'cart_mutation' },
    ],
  });
  assert.equal(result.floor, 'HIGH');
  assert.deepEqual(result.matched_zones.map((zone) => zone.minimum_risk).sort(), ['HIGH', 'MEDIUM']);
});

test('Q-3 manager downgrade below deterministic floor is rejected and logged', () => {
  const result = classifyRisk({
    changed_paths: ['src/modules/payment/refund.ts'],
    sensitive_zones: sensitiveZones,
    manager_risk: 'MEDIUM',
  });
  assert.equal(result.deterministic_floor, 'HIGH');
  assert.equal(result.manager_risk, 'MEDIUM');
  assert.equal(result.effective_risk, 'HIGH');
  assert.equal(result.rejected_downgrade, true);
  assert.deepEqual(result.governance_events, [{
    type: 'MANAGER_DOWNGRADE_REJECTED',
    attempted_risk: 'MEDIUM',
    minimum_risk: 'HIGH',
    effective_risk: 'HIGH',
  }]);
  assert.equal(Object.isFrozen(result.governance_events), true);
  assert.equal(Object.isFrozen(result.governance_events[0]), true);
});

test('deterministic floor is LOW when no sensitive zone matches', () => {
  const result = deterministicRiskFloor({
    changed_paths: ['scripts/multi-agent/risk-verification-policy.mjs'],
    sensitive_zones: sensitiveZones,
  });
  assert.equal(result.floor, 'LOW');
  assert.deepEqual(result.matched_zones, []);
});

test('sensitive zone matching raises deterministic floor and records matched paths', () => {
  const result = deterministicRiskFloor({
    changed_paths: ['src/modules/payment/application/service.ts', 'docs/readme.md'],
    sensitive_zones: sensitiveZones,
  });
  assert.equal(result.floor, 'HIGH');
  assert.equal(result.matched_zones.length, 1);
  assert.equal(result.matched_zones[0].path, 'src/modules/payment/**');
  assert.deepEqual(result.matched_zones[0].matched_paths, ['src/modules/payment/application/service.ts']);
});

test('deterministic floor uses maximum matched zone risk', () => {
  const result = deterministicRiskFloor({
    changed_paths: ['src/modules/example/a.ts', 'database/migrations/999.sql'],
    sensitive_zones: [
      { path: 'src/modules/example/**', minimum_risk: 'MEDIUM', reason: 'example' },
      ...sensitiveZones,
    ],
  });
  assert.equal(result.floor, 'HIGH');
});

test('manager cannot lower deterministic floor', () => {
  const result = classifyRisk({
    changed_paths: ['src/modules/pricing/domain/rule.ts'],
    sensitive_zones: sensitiveZones,
    manager_risk: 'LOW',
  });
  assert.equal(result.deterministic_floor, 'HIGH');
  assert.equal(result.manager_risk, 'LOW');
  assert.equal(result.effective_risk, 'HIGH');
  assert.equal(result.rejected_downgrade, true);
  assert.equal(result.human_gate_required, true);
});

test('manager may escalate above deterministic floor', () => {
  const result = classifyRisk({
    changed_paths: ['scripts/multi-agent/file.mjs'],
    sensitive_zones: sensitiveZones,
    manager_risk: 'MEDIUM',
  });
  assert.equal(result.deterministic_floor, 'LOW');
  assert.equal(result.effective_risk, 'MEDIUM');
  assert.equal(result.rejected_downgrade, false);
  assert.deepEqual(result.governance_events, []);
  assert.equal(result.human_gate_required, false);
});

test('verification policy maps LOW MEDIUM HIGH to frozen gate requirements', () => {
  const low = verificationPolicyForRisk('LOW');
  const medium = verificationPolicyForRisk('MEDIUM');
  const high = verificationPolicyForRisk('HIGH');

  assert.deepEqual(low.required_gates, ['verification']);
  assert.equal(low.reviewer_required, false);
  assert.equal(low.human_gate_required, false);

  assert.deepEqual(medium.required_gates, ['review', 'verification']);
  assert.equal(medium.reviewer_required, true);
  assert.equal(medium.security_required, false);

  assert.deepEqual(high.required_gates, ['review', 'verification', 'security']);
  assert.equal(high.security_required, true);
  assert.equal(high.human_gate_required, true);
  assert.equal(Object.isFrozen(high), true);
  assert.equal(Object.isFrozen(high.required_gates), true);
});

test('§12 derives deterministic minimum checks from all five required sources', () => {
  const policy = deriveVerificationPolicy({
    risk: 'MEDIUM',
    changed_paths: ['src/modules/payment/refund.ts'],
    sensitive_zones: sensitiveZones,
    acceptance_criteria: [
      { id: 'AC-001', verification: 'integration_test', mandatory: true },
      { id: 'AC-002', verification: 'optional_demo', mandatory: false },
    ],
    verification_rules: [
      { id: 'VR-TYPE-TS', source: 'FILE_TYPE', match: '.ts', required_checks: ['typecheck'] },
      { id: 'VR-MODULE-PAYMENT', source: 'MODULE', match: 'payment', required_checks: ['payment_regression'] },
      { id: 'VR-ZONE-PAYMENT', source: 'SENSITIVE_ZONE', match: 'payment_processing', required_checks: ['security_deep'] },
    ],
  });

  assert.deepEqual(policy.deterministic_required_checks, [
    'integration_test',
    'payment_regression',
    'review',
    'security_deep',
    'typecheck',
    'verification',
  ]);
  assert.deepEqual(policy.source.changed_file_types, ['.ts']);
  assert.deepEqual(policy.source.changed_modules, ['payment']);
  assert.deepEqual(policy.source.sensitive_zones, [{ path: 'src/modules/payment/**', reason: 'payment_processing' }]);
  assert.deepEqual(policy.source.acceptance_criteria, ['AC-001']);
  assert.deepEqual(policy.source.matched_verification_rules, ['VR-MODULE-PAYMENT', 'VR-TYPE-TS', 'VR-ZONE-PAYMENT']);
});

test('Reviewer/QA additions are additive and deterministic required checks cannot be removed', () => {
  const base = {
    risk: 'LOW',
    changed_paths: ['src/modules/example/a.ts'],
    sensitive_zones: [],
    acceptance_criteria: [{ id: 'AC-001', verification: 'unit_test', mandatory: true }],
    verification_rules: [{ id: 'VR-TS', source: 'FILE_TYPE', match: '.ts', required_checks: ['typecheck'] }],
  };
  const policy = deriveVerificationPolicy({ ...base, reviewer_additions: ['fuzz_test'] });
  assert.deepEqual(policy.required_checks, ['fuzz_test', 'typecheck', 'unit_test', 'verification']);
  assert.deepEqual(policy.reviewer_added_checks, ['fuzz_test']);

  assert.throws(() => deriveVerificationPolicy({
    ...base,
    reviewer_removals: ['typecheck'],
  }), /REVIEWER_CANNOT_REMOVE_DETERMINISTIC_CHECK:typecheck/);

  const disagreement = deriveVerificationPolicy({
    ...base,
    reviewer_removals: ['optional_non_required_check'],
  });
  assert.deepEqual(disagreement.manager_decisions_required, [{
    type: 'OPTIONAL_CHECK_REMOVAL_REQUIRES_MANAGER',
    check: 'optional_non_required_check',
  }]);
});

test('NOT_EXECUTED never satisfies any derived required check', () => {
  const policy = deriveVerificationPolicy({
    risk: 'LOW',
    changed_paths: ['a.ts'],
    acceptance_criteria: [{ id: 'AC-001', verification: 'unit_test', mandatory: true }],
    verification_rules: [{ id: 'VR-TS', source: 'FILE_TYPE', match: '.ts', required_checks: ['typecheck'] }],
  });
  const result = evaluateRequiredChecks({
    policy,
    statuses: { verification: 'PASS', unit_test: 'PASS', typecheck: 'NOT_EXECUTED' },
  });
  assert.equal(result.verification_passed, false);
  assert.deepEqual(result.blockers, [{ check: 'typecheck', status: 'NOT_EXECUTED' }]);
});

test('NOT_EXECUTED is never treated as PASS', () => {
  const result = evaluateVerification({
    risk: 'MEDIUM',
    gates: { review: 'PASS', verification: 'NOT_EXECUTED' },
  });
  assert.equal(result.verification_passed, false);
  assert.deepEqual(result.blockers, [{ gate: 'verification', status: 'NOT_EXECUTED' }]);
});

test('MEDIUM requires both review and executed verification', () => {
  assert.equal(evaluateVerification({
    risk: 'MEDIUM',
    gates: { review: 'PASS', verification: 'PASS' },
  }).verification_passed, true);

  assert.equal(evaluateVerification({
    risk: 'MEDIUM',
    gates: { review: 'FAIL', verification: 'PASS' },
  }).verification_passed, false);
});

test('HIGH requires review verification security and separately marks Human Gate required', () => {
  const blocked = evaluateVerification({
    risk: 'HIGH',
    gates: { review: 'PASS', verification: 'PASS' },
  });
  assert.equal(blocked.verification_passed, false);
  assert.equal(blocked.human_gate_required, true);
  assert.deepEqual(blocked.blockers, [{ gate: 'security', status: 'NOT_EXECUTED' }]);

  const passed = evaluateVerification({
    risk: 'HIGH',
    gates: { review: 'PASS', verification: 'PASS', security: 'PASS' },
  });
  assert.equal(passed.verification_passed, true);
  assert.equal(passed.human_gate_required, true);
});

test('malformed sensitive zones and gate statuses fail closed', () => {
  assert.throws(() => deterministicRiskFloor({
    changed_paths: ['a.ts'],
    sensitive_zones: [{ path: '', minimum_risk: 'HIGH' }],
  }), /SENSITIVE_ZONE_PATH_REQUIRED/);

  assert.throws(() => evaluateVerification({
    risk: 'LOW',
    gates: { verification: 'UNKNOWN' },
  }), /INVALID_GATE_STATUS:verification/);
});

test('classification evidence is defensively frozen', () => {
  const result = classifyRisk({
    changed_paths: ['src/modules/auth/login.ts'],
    sensitive_zones: sensitiveZones,
    manager_risk: 'LOW',
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.matched_zones), true);
  assert.equal(Object.isFrozen(result.matched_zones[0]), true);
  assert.equal(Object.isFrozen(result.matched_zones[0].matched_paths), true);
  assert.equal(Object.isFrozen(result.governance_events), true);
});
