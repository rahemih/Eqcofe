import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  runArtifactHumanGateIntegration,
  runMergePolicyUpstreamIntegration,
  runNegativeMatrix,
  runPrePilotVerificationGate,
  runRiskProjectMapIntegration,
  runSyntheticHighDryRun,
  runSyntheticLowDryRun,
} from '../../scripts/multi-agent/pre-pilot-verification.mjs';

test('P-4 harness is isolated from product runtime and direct repository mutation APIs', async () => {
  const source = await readFile(new URL('../../scripts/multi-agent/pre-pilot-verification.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs/);
  assert.doesNotMatch(source, /from ['"]node:child_process/);
  assert.doesNotMatch(source, /from ['"]\.\.\/\.\.\/src\//);
  assert.doesNotMatch(source, /from ['"]\.\.\/\.\.\/database\//);
  assert.doesNotMatch(source, /fetch\s*\(/);
});

test('P-4 Risk ↔ Project Map integration rejects LOW downgrade for payment-sensitive path', () => {
  const result = runRiskProjectMapIntegration();
  assert.equal(result.effective_risk, 'HIGH');
  assert.equal(result.rejected_downgrade, true);
  assert.equal(result.human_gate_required, true);
  assert.equal(result.matched_zones.length, 1);
  assert.equal(result.matched_zones[0].reason, 'payment_processing');
  assert.equal(result.governance_events[0].type, 'MANAGER_DOWNGRADE_REJECTED');
});

test('P-4 synthetic LOW completes deterministic lifecycle and Lock ↔ Workflow release', () => {
  const result = runSyntheticLowDryRun();
  assert.equal(result.verification_passed, true);
  assert.equal(result.merge_eligible, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.final_state, 'MERGED');
  assert.equal(result.lock_initial_status, 'ACTIVE');
  assert.equal(result.lock_final_status, 'RELEASED');
});

test('P-4 synthetic HIGH completes exact-artifact Review Security Human Gate lifecycle', () => {
  const result = runSyntheticHighDryRun();
  assert.equal(result.classification.effective_risk, 'HIGH');
  assert.equal(result.classification.rejected_downgrade, true);
  assert.equal(result.human_gate_required, true);
  assert.equal(result.verification_passed, true);
  assert.equal(result.merge_eligible, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.final_state, 'MERGED');
  assert.equal(result.lock_initial_status, 'ACTIVE');
  assert.equal(result.lock_final_status, 'RELEASED');
});

test('P-4 Artifact Binding ↔ Human Gate invalidates all prior artifact-bound evidence', () => {
  const result = runArtifactHumanGateIntegration();
  assert.notEqual(result.original_hash, result.mutated_hash);
  assert.equal(result.current_gate_count_after_mutation, 0);
  assert.equal(result.stale_gate_count_after_mutation, 4);
  assert.equal(result.workflow_state_after_mutation, 'HUMAN_PENDING');
});

test('P-4 Merge Policy ↔ upstream gates passes only with complete upstream evidence', () => {
  const result = runMergePolicyUpstreamIntegration();
  assert.equal(result.all_upstream_pass, true);
  assert.ok(result.review_blockers.includes('REVIEW_PASS_MISSING'));
  assert.ok(result.ci_blockers.includes('REQUIRED_CI_NOT_PASS:phase-a'));
  assert.ok(result.protection_blockers.includes('PROTECTION_NOT_VERIFIED'));
});

test('P-4 negative matrix proves every frozen fail-closed scenario', () => {
  const result = runNegativeMatrix();
  assert.deepEqual(Object.keys(result).sort(), [
    'artifact_mutation_invalidates_approval',
    'external_head_rejected',
    'lock_conflict',
    'protection_drift_blocked',
    'risk_downgrade_rejected',
    'spoofed_required_check_rejected',
    'stale_evidence_rejected',
    'unauthorized_evidence_rejected',
  ]);
  for (const [scenario, passed] of Object.entries(result)) {
    assert.equal(passed, true, `${scenario} must fail closed`);
  }
});

test('P-4 aggregate gate is deterministic PASS without LLM execution or production mutation', () => {
  const result = runPrePilotVerificationGate();
  assert.equal(result.status, 'PASS');
  assert.equal(result.production_mutation, false);
  assert.equal(result.llm_execution, false);
  assert.equal(result.low.final_state, 'MERGED');
  assert.equal(result.high.final_state, 'MERGED');
  assert.equal(result.merge_policy_upstream.all_upstream_pass, true);
  assert.equal(Object.values(result.negative).every(Boolean), true);
});
