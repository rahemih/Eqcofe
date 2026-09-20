import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseGateEvidence, formatGateEvidence, buildTrustedProviderCheckEvidence,
  buildDeterministicReviewEvidence, evaluateMergePolicy,
} from '../../scripts/multi-agent/merge-policy-controller.mjs';
import { buildArtifactBinding } from '../../scripts/multi-agent/artifact-hash-generator.mjs';
import { evaluateVerification } from '../../scripts/multi-agent/risk-verification-policy.mjs';

const task = JSON.parse(readFileSync(new URL('../../docs/14-multi-agent/tasks/MA-V1-ACC-AUTHORITY-SEPARATION-001.json', import.meta.url), 'utf8'));
// Synthetic provider identifiers are confined to this deterministic TEST_ONLY harness.
// Real PR provider evidence is obtained independently from GitHub.
const head = '1'.repeat(40);
const artifact = buildArtifactBinding({ commit_sha: head, changes: task.scope.write.map(path => ({
  path, operation: path.endsWith('TASK-CATALOG.md') ? 'MODIFY' : 'ADD',
  bytes: readFileSync(new URL('../../' + path, import.meta.url)),
})) });
const checks = ['verify', 'phase-a'].map((name, index) => ({
  id: index + 1, name, head_sha: head, app: { id: 15368 }, status: 'completed', conclusion: 'success',
}));
const provider = (runs = checks) => buildTrustedProviderCheckEvidence({ check_runs: runs, head_sha: head, checks: ['verify', 'phase-a'] });
const review = (p = provider()) => buildDeterministicReviewEvidence({ provider_checks: p, artifact_hash: artifact.artifact_hash, head_sha: head });
const lock = {
  gate: 'LOCK', task_id: task.task_id, artifact_hash: artifact.artifact_hash, status: 'ACTIVE',
  lock_id: task.requested_lock_ids[0], owner: task.owner, paths: task.scope.write,
};
const human = { gate: 'HUMAN', task_id: task.task_id, artifact_hash: artifact.artifact_hash, status: 'APPROVED', author_login: 'rahemih' };
const base = {
  task_contract: task, changed_paths: task.scope.write, artifact_binding: artifact,
  protection: { passed: true, required_checks: ['verify', 'phase-a', 'merge-policy'] },
  required_ci: { verify: 'PASS', 'phase-a': 'PASS', 'merge-policy': 'PASS' },
  gate_evidence: { current: { LOCK: lock } }, deterministic_review: review(),
};
const executorComment = (gate, id) => ({
  id, user: { login: 'rahemih', type: 'User' },
  body: formatGateEvidence({ gate, task_id: task.task_id, artifact_hash: artifact.artifact_hash, status: 'PASS', test_mode: true }),
});
const parse = (comments) => parseGateEvidence(comments, {
  task_id: task.task_id, artifact_hash: artifact.artifact_hash, trusted_author_login: 'rahemih',
});

test('6A-1 and 6A-2: executor structured PASS records rejected, not accepted as current evidence', () => {
  const evidence = parse([executorComment('REVIEW', 10), executorComment('VERIFICATION', 11)]);
  assert.equal(evidence.current.REVIEW, undefined);
  assert.equal(evidence.current.VERIFICATION, undefined);
  assert.deepEqual(evidence.unauthorized.map(item => item.reason), ['UNAUTHORIZED_REVIEW_EVIDENCE', 'UNAUTHORIZED_VERIFICATION_EVIDENCE']);
  const result = evaluateMergePolicy({ ...base, gate_evidence: { ...evidence, current: { ...evidence.current, LOCK: lock } } });
  assert.deepEqual(result.blockers, ['UNAUTHORIZED_REVIEW_EVIDENCE', 'UNAUTHORIZED_VERIFICATION_EVIDENCE']);
  assert.equal(result.merge_eligible, false);
});

test('6A-3: genuine HUMAN approval cannot fill missing deterministic Review', () => {
  const result = evaluateMergePolicy({ ...base, deterministic_review: null, gate_evidence: { current: { LOCK: lock, HUMAN: human } } });
  assert.ok(result.blockers.includes('REVIEW_PASS_MISSING'));
  assert.equal(result.merge_eligible, false);
});

test('6A-3: HUMAN approval cannot fill missing provider Verification', () => {
  const result = evaluateMergePolicy({ ...base, required_ci: { ...base.required_ci, verify: 'NOT_EXECUTED' }, gate_evidence: { current: { LOCK: lock, HUMAN: human } } });
  assert.ok(result.blockers.includes('REQUIRED_CI_NOT_PASS:verify'));
  assert.equal(result.merge_eligible, false);
});

test('6A-3: HUMAN approval cannot fill missing Security on HIGH', () => {
  const highTask = { ...task, risk: 'HIGH', human_gate_required: true, authorized_human_approver: { github_login: 'rahemih', role: 'PROJECT_OWNER' } };
  const result = evaluateMergePolicy({ ...base, task_contract: highTask, gate_evidence: { current: { LOCK: lock, HUMAN: human } } });
  assert.ok(result.blockers.includes('SECURITY_PASS_MISSING'));
  assert.equal(result.merge_eligible, false);
});

test('6B: supplementary PASS cannot convert provider NOT_EXECUTED into PASS or readiness', () => {
  const notExecuted = provider(checks.map(c => c.name === 'verify' ? { ...c, status: 'queued', conclusion: null } : c));
  assert.equal(notExecuted.statuses.verify, 'NOT_EXECUTED');
  const deterministic = review(notExecuted);
  assert.equal(deterministic.status, 'NOT_EXECUTED');
  const result = evaluateMergePolicy({
    ...base, deterministic_review: deterministic,
    required_ci: { ...base.required_ci, verify: notExecuted.statuses.verify },
    gate_evidence: { current: { LOCK: lock, SUPPLEMENTARY_REVIEW: { status: 'PASS' } } },
  });
  assert.ok(result.blockers.includes('REVIEW_PASS_MISSING'));
  assert.ok(result.blockers.includes('REQUIRED_CI_NOT_PASS:verify'));
  assert.equal(result.merge_eligible, false);
  const verification = evaluateVerification({ risk: 'MEDIUM', gates: { supplementary_review: 'PASS', verification: 'NOT_EXECUTED' } });
  assert.equal(verification.verification_passed, false);
  assert.ok(verification.blockers.length > 0);
});
