import test from 'node:test';
import assert from 'node:assert/strict';
import {
  V1_ACCEPTANCE_MISSION_HASH,
  V1_ACCEPTANCE_MISSION_VERSION,
  V1_ACCEPTANCE_REQUIRED_CHECKS,
  V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID,
  validatePhase0Snapshot,
} from '../../scripts/multi-agent/v1-acceptance-phase0.mjs';

function validSnapshot() {
  return {
    mission: {
      version: V1_ACCEPTANCE_MISSION_VERSION,
      hash: V1_ACCEPTANCE_MISSION_HASH,
    },
    main_head: '8cb4d84323bba93cf6ae37a73961f0f220efa95c',
    protection: {
      branch_protected: true,
      ruleset_enforcement: 'active',
      strict_required_status_checks_policy: true,
      bypass_actors: [],
      required_checks: V1_ACCEPTANCE_REQUIRED_CHECKS.map((context) => ({
        context,
        integration_id: V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID,
      })),
    },
    acceptance: {
      blocking_acceptance_prs: [],
      stale_locks: [],
      item10_canonical_ancestor: true,
    },
  };
}

test('Stage C Phase 0 validator passes only the complete canonical-safe snapshot', () => {
  const result = validatePhase0Snapshot(validSnapshot());

  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.blockers, []);
  assert.equal(result.blocking_acceptance_pr_count, 0);
  assert.equal(result.stale_lock_count, 0);
  assert.equal(result.item10_canonical_ancestor, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.blockers), true);
});

test('Mission identity and main SHA are fail-closed', () => {
  const snapshot = validSnapshot();
  snapshot.mission.version = 'V1.4';
  snapshot.mission.hash = '0'.repeat(64);
  snapshot.main_head = 'not-a-sha';

  const result = validatePhase0Snapshot(snapshot);

  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.blockers, [
    'MAIN_HEAD_INVALID',
    'MISSION_HASH_MISMATCH',
    'MISSION_VERSION_MISMATCH',
  ]);
});

test('required checks must be exact, unique and trusted-integration-bound', () => {
  const snapshot = validSnapshot();
  snapshot.protection.required_checks = [
    { context: 'verify', integration_id: V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID },
    { context: 'verify', integration_id: V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID },
    { context: 'phase-a', integration_id: 999999 },
    { context: 'unexpected-check', integration_id: V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID },
  ];

  const result = validatePhase0Snapshot(snapshot);

  assert.equal(result.status, 'FAIL');
  assert.ok(result.blockers.includes('REQUIRED_CHECK_DUPLICATE:verify'));
  assert.ok(result.blockers.includes('REQUIRED_CHECK_SET_MISMATCH'));
  assert.ok(result.blockers.includes('REQUIRED_CHECK_INTEGRATION_MISMATCH:phase-a'));
});

test('protection drift and bypass actors cannot produce PASS', () => {
  const snapshot = validSnapshot();
  snapshot.protection.branch_protected = false;
  snapshot.protection.ruleset_enforcement = 'evaluate';
  snapshot.protection.strict_required_status_checks_policy = false;
  snapshot.protection.bypass_actors = [{ actor_id: 1 }];

  const result = validatePhase0Snapshot(snapshot);

  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.blockers, [
    'BRANCH_PROTECTION_INACTIVE',
    'BYPASS_ACTORS_PRESENT',
    'RULESET_NOT_ACTIVE',
    'STRICT_REQUIRED_CHECKS_DISABLED',
  ]);
});

test('blocking acceptance PRs, stale locks and missing Item 10 ancestry fail closed', () => {
  const snapshot = validSnapshot();
  snapshot.acceptance.blocking_acceptance_prs = [999];
  snapshot.acceptance.stale_locks = ['LOCK-STALE-001'];
  snapshot.acceptance.item10_canonical_ancestor = false;

  const result = validatePhase0Snapshot(snapshot);

  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.blockers, [
    'BLOCKING_ACCEPTANCE_PRS_PRESENT',
    'ITEM10_CANONICAL_ANCESTOR_FALSE',
    'STALE_LOCKS_PRESENT',
  ]);
});

test('unverified arrays are not interpreted as empty safe state', () => {
  const snapshot = validSnapshot();
  delete snapshot.protection.bypass_actors;
  delete snapshot.protection.required_checks;
  delete snapshot.acceptance.blocking_acceptance_prs;
  delete snapshot.acceptance.stale_locks;

  const result = validatePhase0Snapshot(snapshot);

  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.blockers, [
    'BLOCKING_ACCEPTANCE_PRS_NOT_VERIFIED',
    'BYPASS_ACTORS_NOT_VERIFIED',
    'REQUIRED_CHECKS_NOT_VERIFIED',
    'STALE_LOCKS_NOT_VERIFIED',
  ]);
  assert.equal(result.blocking_acceptance_pr_count, null);
  assert.equal(result.stale_lock_count, null);
});

test('blocker output is deterministic, unique and sorted', () => {
  const snapshot = validSnapshot();
  snapshot.protection.required_checks = [
    { context: 'verify', integration_id: 42 },
    { context: 'verify', integration_id: 42 },
  ];
  snapshot.acceptance.stale_locks = ['A', 'B'];

  const first = validatePhase0Snapshot(snapshot);
  const second = validatePhase0Snapshot(structuredClone(snapshot));

  assert.deepEqual(first, second);
  assert.deepEqual(first.blockers, [...first.blockers].sort());
  assert.equal(new Set(first.blockers).size, first.blockers.length);
});
