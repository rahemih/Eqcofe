import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GITHUB_ACTIONS_INTEGRATION_ID,
  validateProtectionSnapshot,
} from '../../scripts/multi-agent/merge-policy-controller.mjs';

function canonicalRuleset() {
  return {
    branch_protected: true,
    rulesets: [{
      id: 23278861,
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
    }],
  };
}

function evaluate(name, mutate, expectedBlocker) {
  const snapshot = structuredClone(canonicalRuleset());
  mutate(snapshot.rulesets[0]);
  const result = validateProtectionSnapshot(snapshot);
  assert.equal(result.passed, false, `${name}: drift must fail closed`);
  assert.ok(result.blockers.includes(expectedBlocker), `${name}: missing blocker ${expectedBlocker}`);
  console.log(JSON.stringify({
    marker: 'TEST_7_PROTECTION_DRIFT',
    drift: name,
    expected: 'DRIFT_DETECTED',
    actual: 'DRIFT_DETECTED',
    merge_blocked: true,
    blocker: expectedBlocker,
  }));
  return result;
}

test('Test 7 detects required-check removal', () => {
  evaluate('REQUIRED_CHECK_REMOVED', (ruleset) => {
    const rule = ruleset.rules.find((entry) => entry.type === 'required_status_checks');
    rule.parameters.required_status_checks = rule.parameters.required_status_checks
      .filter((item) => item.context !== 'merge-policy');
  }, 'REQUIRED_STATUS_CONTEXT_MISSING:merge-policy');
});

test('Test 7 detects unexpected bypass actor', () => {
  evaluate('UNEXPECTED_BYPASS_ACTOR', (ruleset) => {
    ruleset.bypass_actors = [{ actor_id: 1 }];
  }, 'PROTECTION_BYPASS_ACTORS_PRESENT');
});

test('Test 7 detects force-push enabled via missing non-fast-forward protection', () => {
  evaluate('FORCE_PUSH_ENABLED', (ruleset) => {
    ruleset.rules = ruleset.rules.filter((entry) => entry.type !== 'non_fast_forward');
  }, 'NON_FAST_FORWARD_PROTECTION_MISSING');
});

test('Test 7 detects required-check integration identity mismatch', () => {
  evaluate('INTEGRATION_IDENTITY_MISMATCH', (ruleset) => {
    const rule = ruleset.rules.find((entry) => entry.type === 'required_status_checks');
    rule.parameters.required_status_checks = rule.parameters.required_status_checks.map((item) => (
      item.context === 'merge-policy' ? { ...item, integration_id: 999999 } : item
    ));
  }, 'REQUIRED_STATUS_CONTEXT_WRONG_INTEGRATION:merge-policy');
});

test('Test 7 canonical baseline remains accepted', () => {
  const result = validateProtectionSnapshot(canonicalRuleset());
  assert.equal(result.passed, true);
  assert.deepEqual(result.blockers, []);
  console.log(JSON.stringify({
    marker: 'TEST_7_PROTECTION_BASELINE',
    actual: 'CANONICAL_PROTECTION_ACCEPTED',
    merge_blocked: false,
  }));
});
