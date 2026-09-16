import { buildArtifactBinding } from './artifact-hash-generator.mjs';
import {
  evaluateMergePolicy,
  formatGateEvidence,
  GITHUB_ACTIONS_INTEGRATION_ID,
  parseGateEvidence,
  validatePrTrustBoundary,
  validateProtectionSnapshot,
} from './merge-policy-controller.mjs';
import { classifyRisk, evaluateVerification } from './risk-verification-policy.mjs';
import { ScopeLockController } from './scope-lock-controller.mjs';
import { transition } from './workflow-controller.mjs';

const REPOSITORY = 'owner/repo';
const OWNER_LOGIN = 'owner';
const BASE_SHA = 'c'.repeat(40);
const LOW_PATH = 'docs/synthetic/low.txt';
const HIGH_PATH = 'src/modules/payment/synthetic-pre-pilot.txt';

export const SYNTHETIC_PROJECT_MAP = Object.freeze({
  sensitive_zones: Object.freeze([
    Object.freeze({
      path: 'src/modules/payment/**',
      minimum_risk: 'HIGH',
      reason: 'payment_processing',
    }),
  ]),
});

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function contract({ taskId, risk, path, lockId, humanGateRequired }) {
  return {
    schema_version: '2.2',
    task_id: taskId,
    risk,
    risk_floor: risk,
    owner: 'BACKEND',
    canonical: { repository: REPOSITORY, branch: 'main', base_sha: BASE_SHA },
    scope: { write: [path], forbidden: [] },
    requested_lock_ids: [lockId],
    human_gate_required: humanGateRequired,
    task_risk_rules: [],
    ...(humanGateRequired
      ? { authorized_human_approver: { role: 'PROJECT_OWNER', github_login: OWNER_LOGIN } }
      : {}),
  };
}

function protectionSnapshot({ branchProtected = true, wrongIntegration = false, bypass = false } = {}) {
  const checks = [
    { context: 'verify', integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
    { context: 'phase-a', integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
    {
      context: 'merge-policy',
      integration_id: wrongIntegration ? 999999 : GITHUB_ACTIONS_INTEGRATION_ID,
    },
  ];
  return {
    branch_protected: branchProtected,
    rulesets: [{
      id: 1,
      target: 'branch',
      enforcement: 'active',
      current_user_can_bypass: 'never',
      bypass_actors: bypass ? [{ actor_id: 1 }] : [],
      conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
      rules: [
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        { type: 'pull_request', parameters: { required_approving_review_count: 0 } },
        {
          type: 'required_status_checks',
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: checks,
          },
        },
      ],
    }],
  };
}

function validProtection() {
  return validateProtectionSnapshot(protectionSnapshot());
}

function requiredCi(overrides = {}) {
  return { verify: 'PASS', 'phase-a': 'PASS', 'merge-policy': 'PASS', ...overrides };
}

function advance(task, states) {
  return states.reduce((current, state) => transition(current, state, {
    now: '2026-09-16T00:00:00Z',
  }), task);
}

function parsedEvidence({ taskId, artifactHash, lockId, path, high = false, author = OWNER_LOGIN }) {
  const payloads = [
    {
      gate: 'LOCK',
      task_id: taskId,
      artifact_hash: artifactHash,
      status: 'ACTIVE',
      lock_id: lockId,
      owner: 'BACKEND',
      paths: [path],
    },
  ];
  if (high) {
    payloads.unshift(
      { gate: 'REVIEW', task_id: taskId, artifact_hash: artifactHash, status: 'PASS' },
      { gate: 'SECURITY', task_id: taskId, artifact_hash: artifactHash, status: 'PASS' },
      { gate: 'HUMAN', task_id: taskId, artifact_hash: artifactHash, status: 'APPROVED' },
    );
  }
  const comments = payloads.map((payload, index) => ({
    id: index + 1,
    user: { login: author },
    body: formatGateEvidence(payload),
    created_at: `2026-09-16T00:00:0${index}Z`,
  }));
  return {
    comments,
    parsed: parseGateEvidence(comments, {
      task_id: taskId,
      artifact_hash: artifactHash,
      trusted_author_login: OWNER_LOGIN,
    }),
  };
}

export function runRiskProjectMapIntegration() {
  const result = classifyRisk({
    changed_paths: [HIGH_PATH],
    sensitive_zones: SYNTHETIC_PROJECT_MAP.sensitive_zones,
    manager_risk: 'LOW',
  });
  return freeze({
    effective_risk: result.effective_risk,
    rejected_downgrade: result.rejected_downgrade,
    human_gate_required: result.human_gate_required,
    matched_zones: result.matched_zones,
    governance_events: result.governance_events,
  });
}

export function runSyntheticLowDryRun() {
  const taskId = 'SYNTHETIC-LOW';
  const lockId = 'LOCK-SYNTHETIC-LOW';
  const taskContract = contract({
    taskId,
    risk: 'LOW',
    path: LOW_PATH,
    lockId,
    humanGateRequired: false,
  });
  const lockController = new ScopeLockController();
  const lock = lockController.acquire({
    lock_id: lockId,
    task_id: taskId,
    owner: 'BACKEND',
    paths: [LOW_PATH],
  }, { now: '2026-09-16T00:00:00Z' });
  const artifact = buildArtifactBinding({
    changes: [{ operation: 'ADD', path: LOW_PATH, bytes: Buffer.from('synthetic-low-v1', 'utf8') }],
    commit_sha: 'synthetic-low-head',
  });
  const evidence = parsedEvidence({
    taskId,
    artifactHash: artifact.artifact_hash,
    lockId,
    path: LOW_PATH,
  });
  const verification = evaluateVerification({ risk: 'LOW', gates: { verification: 'PASS' } });
  const policy = evaluateMergePolicy({
    task_contract: taskContract,
    changed_paths: [LOW_PATH],
    artifact_binding: artifact,
    project_map: { sensitive_zones: [] },
    gate_evidence: evidence.parsed,
    protection: validProtection(),
    required_ci: requiredCi(),
  });

  let task = { state: 'CREATED', human_gate_required: false };
  task = advance(task, [
    'CLASSIFIED',
    'DISPATCHED',
    'IN_PROGRESS',
    'IMPLEMENTATION_READY',
    'REVIEW_PENDING',
    'REVIEW_PASSED',
    'VERIFICATION_PENDING',
    'VERIFICATION_PASSED',
    'MERGE_READY',
    'MERGED',
  ]);
  const released = lockController.release({
    lock_id: lockId,
    task_id: taskId,
    owner: 'BACKEND',
    terminal_state: task.state,
  }, { now: '2026-09-16T00:01:00Z' });

  return freeze({
    task_id: taskId,
    final_state: task.state,
    verification_passed: verification.verification_passed,
    merge_eligible: policy.merge_eligible,
    blockers: policy.blockers,
    lock_initial_status: lock.status,
    lock_final_status: released.status,
    artifact_hash: artifact.artifact_hash,
  });
}

export function runSyntheticHighDryRun() {
  const taskId = 'SYNTHETIC-HIGH';
  const lockId = 'LOCK-SYNTHETIC-HIGH';
  const classification = runRiskProjectMapIntegration();
  const taskContract = contract({
    taskId,
    risk: 'HIGH',
    path: HIGH_PATH,
    lockId,
    humanGateRequired: true,
  });
  const lockController = new ScopeLockController();
  const lock = lockController.acquire({
    lock_id: lockId,
    task_id: taskId,
    owner: 'BACKEND',
    paths: [HIGH_PATH],
  }, { now: '2026-09-16T00:00:00Z' });
  const artifact = buildArtifactBinding({
    changes: [{ operation: 'ADD', path: HIGH_PATH, bytes: Buffer.from('synthetic-high-v1', 'utf8') }],
    commit_sha: 'synthetic-high-head',
  });
  const evidence = parsedEvidence({
    taskId,
    artifactHash: artifact.artifact_hash,
    lockId,
    path: HIGH_PATH,
    high: true,
  });
  const verification = evaluateVerification({
    risk: 'HIGH',
    gates: { review: 'PASS', verification: 'PASS', security: 'PASS' },
  });
  const policy = evaluateMergePolicy({
    task_contract: taskContract,
    changed_paths: [HIGH_PATH],
    artifact_binding: artifact,
    project_map: SYNTHETIC_PROJECT_MAP,
    gate_evidence: evidence.parsed,
    protection: validProtection(),
    required_ci: requiredCi(),
  });

  let task = { state: 'CREATED', human_gate_required: true };
  task = advance(task, [
    'CLASSIFIED',
    'DISPATCHED',
    'IN_PROGRESS',
    'IMPLEMENTATION_READY',
    'REVIEW_PENDING',
    'REVIEW_PASSED',
    'VERIFICATION_PENDING',
    'VERIFICATION_PASSED',
  ]);
  task = transition(task, 'HUMAN_PENDING', { now: '2026-09-16T00:00:20Z' });
  task = transition(task, 'HUMAN_APPROVED', { now: '2026-09-16T00:00:30Z' });
  task = transition(task, 'MERGE_READY', { now: '2026-09-16T00:00:40Z' });
  task = transition(task, 'MERGED', { now: '2026-09-16T00:00:50Z' });
  const released = lockController.release({
    lock_id: lockId,
    task_id: taskId,
    owner: 'BACKEND',
    terminal_state: task.state,
  }, { now: '2026-09-16T00:01:00Z' });

  return freeze({
    task_id: taskId,
    classification,
    final_state: task.state,
    verification_passed: verification.verification_passed,
    merge_eligible: policy.merge_eligible,
    blockers: policy.blockers,
    human_gate_required: policy.human_gate_required,
    lock_initial_status: lock.status,
    lock_final_status: released.status,
    artifact_hash: artifact.artifact_hash,
  });
}

export function runArtifactHumanGateIntegration() {
  const taskId = 'SYNTHETIC-HIGH';
  const lockId = 'LOCK-SYNTHETIC-HIGH';
  const original = buildArtifactBinding({
    changes: [{ operation: 'ADD', path: HIGH_PATH, bytes: Buffer.from('artifact-v1', 'utf8') }],
  });
  const mutated = buildArtifactBinding({
    changes: [{ operation: 'ADD', path: HIGH_PATH, bytes: Buffer.from('artifact-v2', 'utf8') }],
  });
  const evidence = parsedEvidence({
    taskId,
    artifactHash: original.artifact_hash,
    lockId,
    path: HIGH_PATH,
    high: true,
  });
  const reparsed = parseGateEvidence(evidence.comments, {
    task_id: taskId,
    artifact_hash: mutated.artifact_hash,
    trusted_author_login: OWNER_LOGIN,
  });
  const approvalRevoked = transition(
    { state: 'HUMAN_APPROVED', human_gate_required: true },
    'HUMAN_PENDING',
    { artifact_changed: true, now: '2026-09-16T00:02:00Z' },
  );

  return freeze({
    original_hash: original.artifact_hash,
    mutated_hash: mutated.artifact_hash,
    current_gate_count_after_mutation: Object.keys(reparsed.current).length,
    stale_gate_count_after_mutation: reparsed.stale.length,
    workflow_state_after_mutation: approvalRevoked.state,
  });
}

export function runMergePolicyUpstreamIntegration() {
  const taskId = 'SYNTHETIC-HIGH';
  const lockId = 'LOCK-SYNTHETIC-HIGH';
  const taskContract = contract({
    taskId,
    risk: 'HIGH',
    path: HIGH_PATH,
    lockId,
    humanGateRequired: true,
  });
  const artifact = buildArtifactBinding({
    changes: [{ operation: 'ADD', path: HIGH_PATH, bytes: Buffer.from('upstream-v1', 'utf8') }],
  });
  const evidence = parsedEvidence({
    taskId,
    artifactHash: artifact.artifact_hash,
    lockId,
    path: HIGH_PATH,
    high: true,
  });
  const protection = validProtection();
  const base = {
    task_contract: taskContract,
    changed_paths: [HIGH_PATH],
    artifact_binding: artifact,
    project_map: SYNTHETIC_PROJECT_MAP,
    gate_evidence: evidence.parsed,
    protection,
    required_ci: requiredCi(),
  };
  const passed = evaluateMergePolicy(base);
  const missingReview = structuredClone(evidence.parsed);
  delete missingReview.current.REVIEW;
  const reviewBlocked = evaluateMergePolicy({ ...base, gate_evidence: missingReview });
  const ciBlocked = evaluateMergePolicy({ ...base, required_ci: requiredCi({ 'phase-a': 'FAIL' }) });
  const protectionBlocked = evaluateMergePolicy({
    ...base,
    protection: validateProtectionSnapshot(protectionSnapshot({ branchProtected: false })),
  });

  return freeze({
    all_upstream_pass: passed.merge_eligible,
    review_blockers: reviewBlocked.blockers,
    ci_blockers: ciBlocked.blockers,
    protection_blockers: protectionBlocked.blockers,
  });
}

export function runNegativeMatrix() {
  const matrix = {};

  const locks = new ScopeLockController();
  locks.acquire({ lock_id: 'LOCK-A', task_id: 'A', owner: 'BACKEND', paths: ['x/**'] });
  try {
    locks.acquire({ lock_id: 'LOCK-B', task_id: 'B', owner: 'FRONTEND', paths: ['x/y.txt'] });
    matrix.lock_conflict = false;
  } catch (error) {
    matrix.lock_conflict = /LOCK_CONFLICT/.test(error.message);
  }

  const risk = runRiskProjectMapIntegration();
  matrix.risk_downgrade_rejected = risk.rejected_downgrade === true && risk.effective_risk === 'HIGH';

  const artifact = runArtifactHumanGateIntegration();
  matrix.artifact_mutation_invalidates_approval = artifact.workflow_state_after_mutation === 'HUMAN_PENDING';
  matrix.stale_evidence_rejected = artifact.current_gate_count_after_mutation === 0 && artifact.stale_gate_count_after_mutation === 4;

  const unauthorizedComment = [{
    id: 1,
    user: { login: 'attacker' },
    body: formatGateEvidence({
      gate: 'REVIEW',
      task_id: 'UNAUTHORIZED',
      artifact_hash: 'a'.repeat(64),
      status: 'PASS',
    }),
  }];
  const unauthorized = parseGateEvidence(unauthorizedComment, {
    task_id: 'UNAUTHORIZED',
    artifact_hash: 'a'.repeat(64),
    trusted_author_login: OWNER_LOGIN,
  });
  matrix.unauthorized_evidence_rejected = Object.keys(unauthorized.current).length === 0 && unauthorized.unauthorized.length === 1;

  try {
    validatePrTrustBoundary({
      head: { repo: { full_name: 'attacker/fork' } },
      base: { repo: { full_name: REPOSITORY } },
    }, REPOSITORY);
    matrix.external_head_rejected = false;
  } catch (error) {
    matrix.external_head_rejected = /EXTERNAL_HEAD_REPOSITORY_FORBIDDEN/.test(error.message);
  }

  const spoofed = validateProtectionSnapshot(protectionSnapshot({ wrongIntegration: true }));
  matrix.spoofed_required_check_rejected = spoofed.passed === false
    && spoofed.blockers.includes('REQUIRED_STATUS_CONTEXT_WRONG_INTEGRATION:merge-policy');

  const drifted = validateProtectionSnapshot(protectionSnapshot({ branchProtected: false, bypass: true }));
  matrix.protection_drift_blocked = drifted.passed === false
    && drifted.blockers.includes('MAIN_NOT_PROTECTED')
    && drifted.blockers.includes('PROTECTION_BYPASS_ACTORS_PRESENT');

  return freeze(matrix);
}

export function runPrePilotVerificationGate() {
  const low = runSyntheticLowDryRun();
  const high = runSyntheticHighDryRun();
  const riskProjectMap = runRiskProjectMapIntegration();
  const artifactHuman = runArtifactHumanGateIntegration();
  const mergePolicyUpstream = runMergePolicyUpstreamIntegration();
  const negative = runNegativeMatrix();
  const negativePassed = Object.values(negative).every(Boolean);
  const passed = low.merge_eligible
    && low.verification_passed
    && low.final_state === 'MERGED'
    && high.merge_eligible
    && high.verification_passed
    && high.final_state === 'MERGED'
    && riskProjectMap.effective_risk === 'HIGH'
    && riskProjectMap.rejected_downgrade === true
    && artifactHuman.current_gate_count_after_mutation === 0
    && artifactHuman.stale_gate_count_after_mutation === 4
    && mergePolicyUpstream.all_upstream_pass === true
    && negativePassed;

  return freeze({
    status: passed ? 'PASS' : 'FAIL',
    production_mutation: false,
    llm_execution: false,
    low,
    high,
    risk_project_map: riskProjectMap,
    artifact_human_gate: artifactHuman,
    merge_policy_upstream: mergePolicyUpstream,
    negative,
  });
}
