import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATES,
  canTransition,
  transition,
} from '../../scripts/multi-agent/workflow-controller.mjs';

const FIXED_NOW = '2026-09-20T00:00:00Z';

function evaluateIllegalMatrix() {
  const rows = [];
  let allowed = 0;

  for (const from of STATES) {
    for (const to of STATES) {
      if (canTransition(from, to)) {
        allowed += 1;
        continue;
      }

      let observed = null;
      try {
        transition(
          { state: from, human_gate_required: false },
          to,
          { now: FIXED_NOW },
        );
      } catch (error) {
        observed = error instanceof Error ? error.message : String(error);
      }

      const expectedEvidence = `INVALID_TRANSITION:${from}->${to}`;
      assert.equal(observed, expectedEvidence, `illegal transition was not rejected exactly: ${from}->${to}`);

      rows.push({
        from,
        to,
        expected: 'REJECTED',
        actual: 'BLOCKED_AS_EXPECTED',
        evidence: observed,
      });
    }
  }

  return { rows, allowed };
}

function executeValidLowLifecycle() {
  let task = { state: 'CREATED', human_gate_required: false };
  const lifecycle = [
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
  ];

  for (const to of lifecycle) {
    task = transition(task, to, { now: FIXED_NOW });
  }

  return { task, lifecycle };
}

test('Test 5D rejects every illegal canonical workflow transition and records the full matrix', () => {
  const { rows, allowed } = evaluateIllegalMatrix();
  const orderedPairs = STATES.length * STATES.length;

  assert.equal(STATES.length, 20, 'canonical V1.5 state count drifted');
  assert.equal(orderedPairs, 400);
  assert.equal(allowed, 34, 'canonical V1.5 allowed-transition count drifted');
  assert.equal(rows.length, 366, 'canonical V1.5 illegal-transition count drifted');
  assert.equal(rows.length, orderedPairs - allowed);
  assert.equal(rows.every((row) => row.actual === 'BLOCKED_AS_EXPECTED'), true);

  console.log('TEST_5D_MATRIX_BEGIN');
  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
  console.log('TEST_5D_MATRIX_END');
  console.log(JSON.stringify({
    marker: 'TEST_5D_MATRIX_SUMMARY',
    states: STATES.length,
    ordered_pairs: orderedPairs,
    allowed_transitions: allowed,
    illegal_transitions: rows.length,
    illegal_rejected: rows.length,
    illegal_accepted: 0,
  }));
});

test('Test 5D accepts one complete valid canonical LOW lifecycle', () => {
  const { task, lifecycle } = executeValidLowLifecycle();

  assert.equal(task.state, 'MERGED');
  assert.deepEqual(lifecycle, [
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

  console.log(JSON.stringify({
    marker: 'TEST_5D_VALID_LIFECYCLE',
    initial_state: 'CREATED',
    transitions: lifecycle,
    final_state: task.state,
    actual: 'VALID_LIFECYCLE_ACCEPTED',
  }));
});
