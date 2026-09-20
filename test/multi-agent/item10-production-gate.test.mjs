import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEM10_B4_COVERAGE,
  EXPECTED_STATE_TRANSITIONS,
  runItem10PreMergeGate,
  validProtectionFixture,
  verifyArtifactAndEvidence,
  verifyFullStateMachine,
  verifyProtection,
  verifyRepositoryStaticEvidence,
  verifyRiskSecurityHuman,
  verifyScopeAndLock,
} from '../../scripts/multi-agent/item10-production-gate.mjs';

test('Item 10 binds exactly the twenty frozen Mission V1.5 B4 coverage domains', () => {
  assert.equal(ITEM10_B4_COVERAGE.length, 20);
  assert.equal(new Set(ITEM10_B4_COVERAGE).size, 20);
  assert.deepEqual(ITEM10_B4_COVERAGE, [
    'Architecture',
    'Workflow lifecycle',
    'Full State Machine',
    'Scope',
    'Lock',
    'Risk',
    'Artifact binding',
    'Evidence provenance',
    'Authority separation',
    'CI',
    'Security',
    'Human Gate',
    'Merge Policy',
    'Branch Protection',
    'Bypass actors',
    'Trusted integration identity',
    'Token governance',
    'Docs automation',
    'Post-Merge',
    'Fail-Closed behavior',
  ]);
});

test('Item 10 exhaustively verifies every canonical state pair and special transition guard', () => {
  const result = verifyFullStateMachine();
  assert.equal(result.status, 'PASS');
  assert.equal(result.states, Object.keys(EXPECTED_STATE_TRANSITIONS).length);
  assert.equal(result.checked_pairs, result.states * result.states);
});

test('Item 10 verifies deterministic scope and lock fail-closed controls', () => {
  assert.deepEqual(verifyScopeAndLock(), { status: 'PASS' });
});

test('Item 10 deterministic B3 cannot downgrade HIGH risk or remove Security/Human Gate', () => {
  const result = verifyRiskSecurityHuman();
  assert.equal(result.status, 'PASS');
  assert.equal(result.effective_risk, 'HIGH');
  assert.equal(result.human_gate_required, true);
});

test('Item 10 verifies exact-artifact binding plus stale and unauthorized evidence rejection', () => {
  assert.deepEqual(verifyArtifactAndEvidence(), { status: 'PASS' });
});

test('Item 10 protection gate rejects bypass actors, non-strict checks and wrong integration identity', () => {
  const good = validProtectionFixture();
  assert.equal(verifyProtection(good).status, 'PASS');

  const bypass = structuredClone(good);
  bypass.rulesets[0].bypass_actors.push({ actor_id: 1 });
  assert.throws(() => verifyProtection(bypass), /ITEM10_PROTECTION_BLOCKED/);

  const nonStrict = structuredClone(good);
  nonStrict.rulesets[0].rules
    .find((rule) => rule.type === 'required_status_checks')
    .parameters.strict_required_status_checks_policy = false;
  assert.throws(() => verifyProtection(nonStrict), /ITEM10_PROTECTION_BLOCKED/);

  const wrongIdentity = structuredClone(good);
  wrongIdentity.rulesets[0].rules
    .find((rule) => rule.type === 'required_status_checks')
    .parameters.required_status_checks[0].integration_id = 999999;
  assert.throws(() => verifyProtection(wrongIdentity), /ITEM10_PROTECTION_BLOCKED/);
});

test('Item 10 repository evidence binds architecture CI docs token boundary and post-merge contract', async () => {
  const result = await verifyRepositoryStaticEvidence();
  assert.equal(result.status, 'PASS');
  assert.equal(result.architecture, 'PASS');
  assert.equal(result.ci, 'PASS');
  assert.equal(result.token_governance, 'VERIFIED');
  assert.equal(result.quantitative_calibration, 'DEFERRED_TO_V1_1');
  assert.equal(result.docs_automation, 'PASS');
  assert.equal(result.postmerge_static_contract, 'PASS');
});

test('Item 10 pre-merge gate verifies 20/20 coverage but never self-declares terminal canonical completion', async () => {
  const result = await runItem10PreMergeGate();
  assert.equal(result.status, 'PRE_MERGE_VERIFICATION_PASS');
  assert.equal(result.item10_terminal_complete, false);
  assert.equal(result.b3.effective_risk, 'HIGH');
  assert.equal(result.b3.human_gate_required, true);
  assert.equal(result.b4.required_domains, 20);
  assert.equal(result.b4.verified_domains, 20);
  assert.ok(Object.values(result.b4.coverage).every((status) => status === 'PASS'));
  assert.equal(result.b5.token_governance, 'VERIFIED');
  assert.equal(result.b5.quantitative_calibration, 'DEFERRED_TO_V1_1');
  assert.equal(result.b6.state, 'PENDING_PROTECTED_MERGE_AND_EXACT_SHA_POSTMERGE');
});
