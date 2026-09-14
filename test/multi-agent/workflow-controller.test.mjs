import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, transition, assertTerminalImmutable } from '../../scripts/multi-agent/workflow-controller.mjs';

test('normal workflow transition is allowed', () => {
  assert.equal(canTransition('CREATED', 'CLASSIFIED'), true);
  assert.equal(transition({ state: 'CREATED' }, 'CLASSIFIED', { now: '2026-09-14T00:00:00Z' }).state, 'CLASSIFIED');
});

test('undefined transition fails closed', () => {
  assert.throws(() => transition({ state: 'CREATED' }, 'MERGED'), /INVALID_TRANSITION/);
});

test('verification cannot bypass required human gate', () => {
  assert.throws(() => transition({ state: 'VERIFICATION_PASSED', human_gate_required: true }, 'MERGE_READY'), /HUMAN_GATE_REQUIRED/);
});

test('human rejection requires human category', () => {
  assert.throws(() => transition({ state: 'HUMAN_PENDING' }, 'HUMAN_REJECTED', {}), /REJECTION_INVALID/);
  const rejected = transition({ state: 'HUMAN_PENDING' }, 'HUMAN_REJECTED', { rejection_category: 'FIXABLE' });
  assert.equal(rejected.rejection_category, 'FIXABLE');
});

test('rejection category controls route', () => {
  assert.equal(transition({ state: 'HUMAN_REJECTED', rejection_category: 'FIXABLE' }, 'FIX_REQUIRED').state, 'FIX_REQUIRED');
  assert.throws(() => transition({ state: 'HUMAN_REJECTED', rejection_category: 'WRONG_APPROACH' }, 'FIX_REQUIRED'), /REJECTION_ROUTE_INVALID/);
  assert.equal(transition({ state: 'HUMAN_REJECTED', rejection_category: 'WRONG_APPROACH' }, 'ABORTED').state, 'ABORTED');
});

test('approval invalidation requires artifact mutation', () => {
  assert.throws(() => transition({ state: 'HUMAN_APPROVED' }, 'HUMAN_PENDING'), /APPROVAL_INVALIDATION/);
  assert.equal(transition({ state: 'HUMAN_APPROVED' }, 'HUMAN_PENDING', { artifact_changed: true }).state, 'HUMAN_PENDING');
});

test('terminal states are immutable', () => {
  assert.throws(() => assertTerminalImmutable({ state: 'MERGED' }, 'IN_PROGRESS'), /TERMINAL_STATE_IMMUTABLE/);
  assert.equal(assertTerminalImmutable({ state: 'ABORTED' }, 'ABORTED'), true);
});
