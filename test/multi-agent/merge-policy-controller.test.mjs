import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateMergePolicy,
  formatGateEvidence,
  parseGateEvidence,
  validateProtectionSnapshot,
} from '../../scripts/multi-agent/merge-policy-controller.mjs';

const HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);

function contract(overrides = {}) {
  return {
    schema_version: '2.2',
    task_id: 'MA-TEST-001',
    risk: 'HIGH',
    risk_floor: 'HIGH',
    owner: 'BACKEND',
    scope: { write: ['a.txt'], forbidden: ['forbidden/**'] },
    requested_lock_ids: ['LOCK-1'],
    human_gate_required: true,
    task_risk_rules: [{ id: 'HIGH-CONTROL', risk: 'HIGH', paths: ['a.txt'] }],
    authorized_human_approver: { role: 'PROJECT_OWNER', github_login: 'owner' },
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    current: {
      REVIEW: { gate: 'REVIEW', status: 'PASS', artifact_hash: HASH, task_id: 'MA-TEST-001' },
      SECURITY: { gate: 'SECURITY', status: 'PASS', artifact_hash: HASH, task_id: 'MA-TEST-001' },
      HUMAN: { gate: 'HUMAN', status: 'APPROVED', artifact_hash: HASH, task_id: 'MA-TEST-001', author_login: 'owner' },
      LOCK: {
        gate: 'LOCK', status: 'ACTIVE', artifact_hash: HASH, task_id: 'MA-TEST-001',
        lock_id: 'LOCK-1', owner: 'BACKEND', paths: ['a.txt'],
      },
      ...(overrides.current ?? {}),
    },
  };
}

function protection(overrides = {}) {
  return { passed: true, blockers: [], required_checks: ['phase-a', 'verify'], ruleset_id: 1, ...overrides };
}

function policyInput(overrides = {}) {
  return {
    task_contract: contract(),
    changed_paths: ['a.txt'],
    artifact_binding: { artifact_hash: HASH, commit_sha: 'head' },
    project_map: { sensitive_zones: [] },
    gate_evidence: evidence(),
    protection: protection(),
    required_ci: { verify: 'PASS', 'phase-a': 'PASS' },
    ...overrides,
  };
}

function rulesetSnapshot(mutator = (value) => value) {
  const ruleset = {
    id: 1,
    target: 'branch',
    enforcement: 'active',
    current_user_can_bypass: 'never',
    bypass_actors: [],
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      { type: 'pull_request', parameters: { required_approving_review_count: 0 } },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [{ context: 'verify' }, { context: 'phase-a' }],
        },
      },
    ],
  };
  return { branch_protected: true, rulesets: [mutator(structuredClone(ruleset))] };
}

test('HIGH task becomes merge-eligible only when all deterministic gates pass', () => {
  const result = evaluateMergePolicy(policyInput());
  assert.equal(result.merge_eligible, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.effective_risk, 'HIGH');
  assert.equal(result.human_gate_required, true);
});

test('HIGH Human Gate fails closed when approval is missing', () => {
  const input = policyInput();
  delete input.gate_evidence.current.HUMAN;
  const result = evaluateMergePolicy(input);
  assert.equal(result.merge_eligible, false);
  assert.ok(result.blockers.includes('HUMAN_APPROVAL_MISSING'));
});

test('Human Approval must come from configured Project Owner login', () => {
  const result = evaluateMergePolicy(policyInput({
    gate_evidence: evidence({ current: { HUMAN: { gate: 'HUMAN', status: 'APPROVED', artifact_hash: HASH, task_id: 'MA-TEST-001', author_login: 'someone-else' } } }),
  }));
  assert.ok(result.blockers.includes('HUMAN_APPROVER_UNAUTHORIZED'));
});

test('HIGH task requires artifact-bound Security PASS', () => {
  const input = policyInput();
  delete input.gate_evidence.current.SECURITY;
  const result = evaluateMergePolicy(input);
  assert.ok(result.blockers.includes('SECURITY_PASS_MISSING'));
});

test('Reviewer PASS is mandatory for HIGH task', () => {
  const input = policyInput();
  delete input.gate_evidence.current.REVIEW;
  const result = evaluateMergePolicy(input);
  assert.ok(result.blockers.includes('REVIEW_PASS_MISSING'));
});

test('out-of-scope and forbidden mutations fail closed', () => {
  const out = evaluateMergePolicy(policyInput({ changed_paths: ['other.txt'] }));
  assert.ok(out.blockers.some((item) => item.includes('OUT_OF_SCOPE')));
  const forbidden = evaluateMergePolicy(policyInput({ changed_paths: ['forbidden/x.txt'] }));
  assert.ok(forbidden.blockers.some((item) => item.includes('FORBIDDEN_SCOPE')));
});

test('lock must be ACTIVE, task-bound, requested and cover exact write scope', () => {
  const result = evaluateMergePolicy(policyInput({
    gate_evidence: evidence({ current: { LOCK: {
      gate: 'LOCK', status: 'RELEASED', artifact_hash: HASH, task_id: 'OTHER',
      lock_id: 'OTHER-LOCK', owner: 'FRONTEND', paths: ['different.txt'],
    } } }),
  }));
  assert.ok(result.blockers.includes('LOCK_NOT_ACTIVE'));
  assert.ok(result.blockers.includes('LOCK_ID_NOT_REQUESTED'));
  assert.ok(result.blockers.includes('LOCK_TASK_MISMATCH'));
  assert.ok(result.blockers.includes('LOCK_OWNER_MISMATCH'));
  assert.ok(result.blockers.includes('LOCK_SCOPE_MISMATCH'));
});

test('required CI is revalidated before actual merge eligibility', () => {
  const result = evaluateMergePolicy(policyInput({ required_ci: { verify: 'PASS', 'phase-a': 'NOT_EXECUTED' } }));
  assert.equal(result.merge_eligible, false);
  assert.ok(result.blockers.includes('REQUIRED_CI_NOT_PASS:phase-a'));
});

test('CI policy-gate mode can defer self-referential required-CI revalidation only', () => {
  const result = evaluateMergePolicy(policyInput({ required_ci: {}, require_required_ci: false }));
  assert.equal(result.merge_eligible, true);
  assert.equal(result.required_ci_checked, false);
});

test('contract risk cannot be below deterministic declared risk floor', () => {
  const result = evaluateMergePolicy(policyInput({
    task_contract: contract({ risk: 'MEDIUM', risk_floor: 'HIGH', human_gate_required: false, task_risk_rules: [] }),
  }));
  assert.ok(result.blockers.includes('CONTRACT_RISK_BELOW_FLOOR'));
  assert.ok(result.blockers.includes('HUMAN_GATE_REQUIRED_BY_RISK'));
});

test('protection validator accepts active no-bypass strict main ruleset', () => {
  const result = validateProtectionSnapshot(rulesetSnapshot());
  assert.equal(result.passed, true);
  assert.deepEqual(result.required_checks, ['phase-a', 'verify']);
});

test('protection validator fails closed on bypass actor', () => {
  const result = validateProtectionSnapshot(rulesetSnapshot((ruleset) => {
    ruleset.bypass_actors = [{ actor_id: 1 }];
    return ruleset;
  }));
  assert.ok(result.blockers.includes('PROTECTION_BYPASS_ACTORS_PRESENT'));
});

test('protection validator fails closed when strict checks or exact required contexts are missing', () => {
  const result = validateProtectionSnapshot(rulesetSnapshot((ruleset) => {
    const rule = ruleset.rules.find((entry) => entry.type === 'required_status_checks');
    rule.parameters.strict_required_status_checks_policy = false;
    rule.parameters.required_status_checks = [{ context: 'verify' }];
    return ruleset;
  }));
  assert.ok(result.blockers.includes('STRICT_STATUS_CHECKS_REQUIRED'));
  assert.ok(result.blockers.includes('REQUIRED_STATUS_CONTEXT_MISSING:phase-a'));
});

test('protection validator rejects ambiguous active rulesets', () => {
  const snapshot = rulesetSnapshot();
  snapshot.rulesets.push(structuredClone(snapshot.rulesets[0]));
  const result = validateProtectionSnapshot(snapshot);
  assert.ok(result.blockers.includes('PROTECTION_RULESET_AMBIGUOUS:2'));
});

test('gate evidence parser keeps only exact-artifact evidence and records stale evidence', () => {
  const comments = [
    { id: 1, user: { login: 'reviewer' }, body: formatGateEvidence({ gate: 'REVIEW', task_id: 'MA-TEST-001', artifact_hash: OTHER_HASH, status: 'PASS' }) },
    { id: 2, user: { login: 'reviewer' }, body: formatGateEvidence({ gate: 'REVIEW', task_id: 'MA-TEST-001', artifact_hash: HASH, status: 'PASS' }) },
  ];
  const result = parseGateEvidence(comments, { task_id: 'MA-TEST-001', artifact_hash: HASH });
  assert.equal(result.current.REVIEW.comment_id, 2);
  assert.equal(result.stale.length, 1);
});

test('artifact mutation invalidates prior Review, Security, Human and Lock evidence together', () => {
  const comments = ['REVIEW', 'SECURITY', 'HUMAN', 'LOCK'].map((gate, index) => ({
    id: index + 1,
    user: { login: gate === 'HUMAN' ? 'owner' : 'system' },
    body: formatGateEvidence({
      gate,
      task_id: 'MA-TEST-001',
      artifact_hash: HASH,
      status: gate === 'HUMAN' ? 'APPROVED' : gate === 'LOCK' ? 'ACTIVE' : 'PASS',
      ...(gate === 'LOCK' ? { lock_id: 'LOCK-1', owner: 'BACKEND', paths: ['a.txt'] } : {}),
    }),
  }));
  const result = parseGateEvidence(comments, { task_id: 'MA-TEST-001', artifact_hash: OTHER_HASH });
  assert.deepEqual(result.current, {});
  assert.equal(result.stale.length, 4);
});

test('protection failure always blocks merge even when all other gates pass', () => {
  const result = evaluateMergePolicy(policyInput({ protection: protection({ passed: false, blockers: ['PROTECTION_DRIFT'] }) }));
  assert.ok(result.blockers.includes('PROTECTION_NOT_VERIFIED'));
});
