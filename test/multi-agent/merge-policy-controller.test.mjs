import test from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactScopePaths,
  buildDeterministicReviewEvidence,
  buildTrustedProviderCheckEvidence,
  DETERMINISTIC_REVIEW_CHECKS,
  evaluateMergePolicy,
  formatGateEvidence,
  GITHUB_ACTIONS_INTEGRATION_ID,
  parseGateEvidence,
  taskContractPathFromBody,
  validatePrTrustBoundary,
  validateProtectionSnapshot,
  validateTaskContractAuthority,
} from '../../scripts/multi-agent/merge-policy-controller.mjs';

const HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);
const BASE_SHA = 'c'.repeat(40);

function contract(overrides = {}) {
  return {
    schema_version: '2.2',
    task_id: 'MA-TEST-001',
    risk: 'HIGH',
    risk_floor: 'HIGH',
    owner: 'BACKEND',
    canonical: { repository: 'owner/repo', branch: 'main', base_sha: BASE_SHA },
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
      SECURITY: { gate: 'SECURITY', status: 'PASS', artifact_hash: HASH, task_id: 'MA-TEST-001' },
      HUMAN: { gate: 'HUMAN', status: 'APPROVED', artifact_hash: HASH, task_id: 'MA-TEST-001', author_login: 'owner' },
      LOCK: {
        gate: 'LOCK', status: 'ACTIVE', artifact_hash: HASH, task_id: 'MA-TEST-001',
        lock_id: 'LOCK-1', owner: 'BACKEND', paths: ['a.txt'],
      },
      ...(overrides.current ?? {}),
    },
    stale: overrides.stale ?? [],
    malformed: overrides.malformed ?? [],
    unauthorized: overrides.unauthorized ?? [],
  };
}

function providerChecks(overrides = {}) {
  const headSha = overrides.head_sha ?? 'head';
  const appId = overrides.integration_id ?? GITHUB_ACTIONS_INTEGRATION_ID;
  const runs = overrides.check_runs ?? [
    { id: 10, name: 'verify', status: 'completed', conclusion: 'success', head_sha: headSha, app: { id: appId } },
    { id: 11, name: 'phase-a', status: 'completed', conclusion: 'success', head_sha: headSha, app: { id: appId } },
  ];
  return buildTrustedProviderCheckEvidence({
    check_runs: runs,
    checks: overrides.checks ?? DETERMINISTIC_REVIEW_CHECKS,
    head_sha: headSha,
    required_integration_id: overrides.required_integration_id ?? GITHUB_ACTIONS_INTEGRATION_ID,
  });
}

function deterministicReview(overrides = {}) {
  const review = buildDeterministicReviewEvidence({
    provider_checks: overrides.provider_checks ?? providerChecks(),
    artifact_hash: overrides.artifact_hash ?? HASH,
    head_sha: overrides.head_sha ?? 'head',
  });
  return { ...review, ...(overrides.record ?? {}) };
}

function protection(overrides = {}) {
  return { passed: true, blockers: [], required_checks: ['merge-policy', 'phase-a', 'verify'], ruleset_id: 1, ...overrides };
}

function policyInput(overrides = {}) {
  return {
    task_contract: contract(),
    changed_paths: ['a.txt'],
    artifact_binding: { artifact_hash: HASH, commit_sha: 'head' },
    project_map: { sensitive_zones: [] },
    gate_evidence: evidence(),
    deterministic_review: deterministicReview(),
    protection: protection(),
    required_ci: { verify: 'PASS', 'phase-a': 'PASS', 'merge-policy': 'PASS' },
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
          required_status_checks: [
            { context: 'verify', integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
            { context: 'phase-a', integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
            { context: 'merge-policy', integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
          ],
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

test('Deterministic Review PASS is mandatory for HIGH task', () => {
  const input = policyInput();
  delete input.deterministic_review;
  const result = evaluateMergePolicy(input);
  assert.ok(result.blockers.includes('REVIEW_PASS_MISSING'));
});

test('out-of-scope and forbidden mutations fail closed', () => {
  const out = evaluateMergePolicy(policyInput({ changed_paths: ['other.txt'] }));
  assert.ok(out.blockers.some((item) => item.includes('OUT_OF_SCOPE')));
  const forbidden = evaluateMergePolicy(policyInput({ changed_paths: ['forbidden/x.txt'] }));
  assert.ok(forbidden.blockers.some((item) => item.includes('FORBIDDEN_SCOPE')));
});

test('RENAME scope validation includes both source and destination paths', () => {
  const paths = artifactScopePaths({ manifest: [{
    operation: 'RENAME',
    from_path: 'outside.txt',
    normalized_repository_relative_path: 'a.txt',
    content_sha256: HASH,
  }] });
  assert.deepEqual(paths, ['a.txt', 'outside.txt']);
  const result = evaluateMergePolicy(policyInput({ changed_paths: paths }));
  assert.ok(result.blockers.some((item) => item.includes('OUT_OF_SCOPE')));
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

test('all three required CI contexts are revalidated before actual merge eligibility', () => {
  const result = evaluateMergePolicy(policyInput({ required_ci: { verify: 'PASS', 'phase-a': 'PASS', 'merge-policy': 'NOT_EXECUTED' } }));
  assert.equal(result.merge_eligible, false);
  assert.ok(result.blockers.includes('REQUIRED_CI_NOT_PASS:merge-policy'));
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

test('protection validator accepts active no-bypass strict main ruleset with all three GitHub Actions checks', () => {
  const result = validateProtectionSnapshot(rulesetSnapshot());
  assert.equal(result.passed, true);
  assert.deepEqual(result.required_checks, ['merge-policy', 'phase-a', 'verify']);
  assert.equal(result.required_integration_id, GITHUB_ACTIONS_INTEGRATION_ID);
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
    rule.parameters.required_status_checks = [
      { context: 'verify', integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
      { context: 'phase-a', integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
    ];
    return ruleset;
  }));
  assert.ok(result.blockers.includes('STRICT_STATUS_CHECKS_REQUIRED'));
  assert.ok(result.blockers.includes('REQUIRED_STATUS_CONTEXT_MISSING:merge-policy'));
});

test('protection validator rejects required context from wrong integration source', () => {
  const result = validateProtectionSnapshot(rulesetSnapshot((ruleset) => {
    const rule = ruleset.rules.find((entry) => entry.type === 'required_status_checks');
    rule.parameters.required_status_checks = rule.parameters.required_status_checks.map((item) => (
      item.context === 'merge-policy' ? { ...item, integration_id: 999999 } : item
    ));
    return ruleset;
  }));
  assert.ok(result.blockers.includes('REQUIRED_STATUS_CONTEXT_WRONG_INTEGRATION:merge-policy'));
});

test('protection validator rejects ambiguous active rulesets', () => {
  const snapshot = rulesetSnapshot();
  snapshot.rulesets.push(structuredClone(snapshot.rulesets[0]));
  const result = validateProtectionSnapshot(snapshot);
  assert.ok(result.blockers.includes('PROTECTION_RULESET_AMBIGUOUS:2'));
});

test('gate evidence parser keeps only exact-artifact Security evidence and records stale evidence', () => {
  const comments = [
    { id: 1, user: { login: 'reviewer' }, body: formatGateEvidence({ gate: 'SECURITY', task_id: 'MA-TEST-001', artifact_hash: OTHER_HASH, status: 'PASS' }) },
    { id: 2, user: { login: 'reviewer' }, body: formatGateEvidence({ gate: 'SECURITY', task_id: 'MA-TEST-001', artifact_hash: HASH, status: 'PASS' }) },
  ];
  const result = parseGateEvidence(comments, { task_id: 'MA-TEST-001', artifact_hash: HASH });
  assert.equal(result.current.SECURITY.comment_id, 2);
  assert.equal(result.stale.length, 1);
});

test('Executor REVIEW and VERIFICATION comments are explicitly rejected as unauthorized evidence', () => {
  const comments = [
    { id: 1, user: { login: 'owner', type: 'User' }, body: formatGateEvidence({ gate: 'REVIEW', task_id: 'MA-TEST-001', artifact_hash: HASH, status: 'PASS' }) },
    { id: 2, user: { login: 'owner', type: 'User' }, body: formatGateEvidence({ gate: 'VERIFICATION', task_id: 'MA-TEST-001', artifact_hash: HASH, status: 'PASS' }) },
  ];
  const parsed = parseGateEvidence(comments, {
    task_id: 'MA-TEST-001',
    artifact_hash: HASH,
    trusted_author_login: 'owner',
  });
  assert.equal(parsed.current.REVIEW, undefined);
  assert.equal(parsed.current.VERIFICATION, undefined);
  assert.deepEqual(
    parsed.unauthorized.map((record) => record.reason).sort(),
    ['UNAUTHORIZED_REVIEW_EVIDENCE', 'UNAUTHORIZED_VERIFICATION_EVIDENCE'],
  );

  const result = evaluateMergePolicy(policyInput({
    gate_evidence: evidence({ unauthorized: parsed.unauthorized }),
  }));
  assert.ok(result.blockers.includes('UNAUTHORIZED_REVIEW_EVIDENCE'));
  assert.ok(result.blockers.includes('UNAUTHORIZED_VERIFICATION_EVIDENCE'));
  assert.equal(result.merge_eligible, false);
});

test('trusted provider checks require exact head and GitHub Actions integration identity', () => {
  const runs = [
    { id: 20, name: 'verify', status: 'completed', conclusion: 'success', head_sha: 'head', app: { id: GITHUB_ACTIONS_INTEGRATION_ID } },
    { id: 21, name: 'phase-a', status: 'completed', conclusion: 'success', head_sha: 'head', app: { id: GITHUB_ACTIONS_INTEGRATION_ID } },
    { id: 30, name: 'verify', status: 'completed', conclusion: 'success', head_sha: 'head', app: { id: 999999 } },
    { id: 31, name: 'phase-a', status: 'completed', conclusion: 'success', head_sha: 'other-head', app: { id: GITHUB_ACTIONS_INTEGRATION_ID } },
  ];
  const provider = buildTrustedProviderCheckEvidence({
    check_runs: runs,
    checks: DETERMINISTIC_REVIEW_CHECKS,
    head_sha: 'head',
  });
  assert.deepEqual(provider.statuses, { 'phase-a': 'PASS', verify: 'PASS' });
  assert.equal(provider.facts.verify.check_run_id, 20);
  assert.equal(provider.facts['phase-a'].check_run_id, 21);
  assert.equal(provider.integration_id, GITHUB_ACTIONS_INTEGRATION_ID);
});

test('deterministic review is exact-artifact/exact-head bound and fails closed on missing provider PASS', () => {
  const missingPhaseA = providerChecks({
    check_runs: [
      { id: 10, name: 'verify', status: 'completed', conclusion: 'success', head_sha: 'head', app: { id: GITHUB_ACTIONS_INTEGRATION_ID } },
    ],
  });
  const pending = buildDeterministicReviewEvidence({
    provider_checks: missingPhaseA,
    artifact_hash: HASH,
    head_sha: 'head',
  });
  assert.equal(pending.status, 'NOT_EXECUTED');
  assert.deepEqual(pending.missing_checks, ['phase-a']);

  const noReview = evaluateMergePolicy(policyInput({ deterministic_review: pending }));
  assert.ok(noReview.blockers.includes('REVIEW_PASS_MISSING'));

  const wrongArtifact = evaluateMergePolicy(policyInput({
    deterministic_review: deterministicReview({ artifact_hash: OTHER_HASH }),
  }));
  assert.ok(wrongArtifact.blockers.includes('REVIEW_ARTIFACT_MISMATCH'));

  const wrongHead = evaluateMergePolicy(policyInput({
    deterministic_review: deterministicReview({ record: { head_sha: 'other-head' } }),
  }));
  assert.ok(wrongHead.blockers.includes('REVIEW_HEAD_MISMATCH'));
});

test('Human Approval cannot substitute for deterministic Review or Security', () => {
  const input = policyInput();
  delete input.deterministic_review;
  delete input.gate_evidence.current.SECURITY;
  assert.equal(input.gate_evidence.current.HUMAN.status, 'APPROVED');
  const result = evaluateMergePolicy(input);
  assert.ok(result.blockers.includes('REVIEW_PASS_MISSING'));
  assert.ok(result.blockers.includes('SECURITY_PASS_MISSING'));
  assert.equal(result.merge_eligible, false);
});

test('trusted gate transport ignores matching evidence from unauthorized commenter', () => {
  const comments = [
    { id: 1, user: { login: 'attacker' }, body: formatGateEvidence({ gate: 'SECURITY', task_id: 'MA-TEST-001', artifact_hash: HASH, status: 'PASS' }) },
    { id: 2, user: { login: 'owner' }, body: formatGateEvidence({ gate: 'SECURITY', task_id: 'MA-TEST-001', artifact_hash: HASH, status: 'PASS' }) },
  ];
  const result = parseGateEvidence(comments, {
    task_id: 'MA-TEST-001',
    artifact_hash: HASH,
    trusted_author_login: 'owner',
  });
  assert.equal(result.current.SECURITY.comment_id, 2);
  assert.equal(result.unauthorized.length, 1);
  assert.equal(result.unauthorized[0].author_login, 'attacker');
});

test('artifact mutation invalidates Security, Human and Lock comment evidence together', () => {
  const comments = ['SECURITY', 'HUMAN', 'LOCK'].map((gate, index) => ({
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
  assert.equal(result.stale.length, 3);
});

test('task contract path is repository-relative, single-file and bound to task directory', () => {
  assert.equal(
    taskContractPathFromBody('Task Contract: `docs/14-multi-agent/tasks/MA-TEST-001.json`'),
    'docs/14-multi-agent/tasks/MA-TEST-001.json',
  );
  assert.throws(
    () => taskContractPathFromBody('Task Contract: `../../tmp/evil.json`'),
    /PATH_TRAVERSAL_FORBIDDEN|PR_TASK_CONTRACT_PATH_FORBIDDEN/,
  );
  assert.throws(
    () => taskContractPathFromBody('Task Contract: `docs/14-multi-agent/tasks/nested/evil.json`'),
    /PR_TASK_CONTRACT_PATH_FORBIDDEN/,
  );
});

test('task contract authority is bound to repository, base, task id and trusted Project Owner', () => {
  assert.equal(validateTaskContractAuthority({
    contract: contract(),
    contract_path: 'docs/14-multi-agent/tasks/MA-TEST-001.json',
    repository: 'owner/repo',
    base_branch: 'main',
    base_sha: BASE_SHA,
    trusted_owner_login: 'owner',
  }), true);
  assert.throws(() => validateTaskContractAuthority({
    contract: contract({ authorized_human_approver: { role: 'PROJECT_OWNER', github_login: 'attacker' } }),
    contract_path: 'docs/14-multi-agent/tasks/MA-TEST-001.json',
    repository: 'owner/repo',
    base_branch: 'main',
    base_sha: BASE_SHA,
    trusted_owner_login: 'owner',
  }), /TASK_HUMAN_APPROVER_NOT_TRUSTED_OWNER/);
  assert.throws(() => validateTaskContractAuthority({
    contract: contract(),
    contract_path: 'docs/14-multi-agent/tasks/OTHER.json',
    repository: 'owner/repo',
    base_branch: 'main',
    base_sha: BASE_SHA,
    trusted_owner_login: 'owner',
  }), /TASK_CONTRACT_PATH_TASK_ID_MISMATCH/);
});

test('external fork head repository is rejected before policy evaluation', () => {
  assert.equal(validatePrTrustBoundary({
    head: { repo: { full_name: 'owner/repo' } },
    base: { repo: { full_name: 'owner/repo' } },
  }, 'owner/repo'), true);
  assert.throws(() => validatePrTrustBoundary({
    head: { repo: { full_name: 'attacker/fork' } },
    base: { repo: { full_name: 'owner/repo' } },
  }, 'owner/repo'), /EXTERNAL_HEAD_REPOSITORY_FORBIDDEN/);
});

test('protection failure always blocks merge even when all other gates pass', () => {
  const result = evaluateMergePolicy(policyInput({ protection: protection({ passed: false, blockers: ['PROTECTION_DRIFT'] }) }));
  assert.ok(result.blockers.includes('PROTECTION_NOT_VERIFIED'));
});
