const TRANSITIONS = Object.freeze({
  CREATED: ['CLASSIFIED'],
  CLASSIFIED: ['DISPATCHED'],
  DISPATCHED: ['IN_PROGRESS'],
  IN_PROGRESS: ['IMPLEMENTATION_READY', 'BLOCKED_CONTEXT', 'BLOCKED_TECHNICAL'],
  IMPLEMENTATION_READY: ['REVIEW_PENDING'],
  REVIEW_PENDING: ['REVIEW_PASSED', 'REVIEW_FAILED', 'BLOCKED_CONTEXT'],
  REVIEW_PASSED: ['VERIFICATION_PENDING'],
  REVIEW_FAILED: ['FIX_REQUIRED'],
  VERIFICATION_PENDING: ['VERIFICATION_PASSED', 'VERIFICATION_FAILED', 'BLOCKED_CONTEXT'],
  VERIFICATION_PASSED: ['HUMAN_PENDING', 'MERGE_READY'],
  VERIFICATION_FAILED: ['FIX_REQUIRED'],
  FIX_REQUIRED: ['IN_PROGRESS', 'BLOCKED_TECHNICAL'],
  BLOCKED_CONTEXT: ['IN_PROGRESS', 'HUMAN_PENDING', 'ABORTED'],
  BLOCKED_TECHNICAL: ['FIX_REQUIRED', 'HUMAN_PENDING', 'ABORTED'],
  HUMAN_PENDING: ['HUMAN_APPROVED', 'HUMAN_REJECTED'],
  HUMAN_APPROVED: ['MERGE_READY', 'HUMAN_PENDING'],
  HUMAN_REJECTED: ['FIX_REQUIRED', 'ABORTED'],
  MERGE_READY: ['MERGED', 'HUMAN_PENDING'],
  MERGED: [],
  ABORTED: [],
});

export const STATES = Object.freeze(Object.keys(TRANSITIONS));
export const TERMINAL_STATES = Object.freeze(['MERGED', 'ABORTED']);

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function transition(task, to, context = {}) {
  if (!task || typeof task !== 'object') throw new TypeError('task is required');
  const from = task.state;
  if (!STATES.includes(from) || !STATES.includes(to)) throw new Error('UNKNOWN_STATE');
  if (!canTransition(from, to)) throw new Error(`INVALID_TRANSITION:${from}->${to}`);

  if (from === 'VERIFICATION_PASSED') {
    if (task.human_gate_required === true && to !== 'HUMAN_PENDING') throw new Error('HUMAN_GATE_REQUIRED');
    if (task.human_gate_required !== true && to === 'HUMAN_PENDING' && context.reason !== 'HUMAN_ESCALATION') throw new Error('HUMAN_GATE_NOT_REQUIRED');
  }

  if (from === 'HUMAN_PENDING' && to === 'HUMAN_REJECTED') {
    if (!['FIXABLE', 'WRONG_APPROACH', 'OUT_OF_SCOPE'].includes(context.rejection_category)) throw new Error('REJECTION_INVALID');
  }

  if (from === 'HUMAN_REJECTED') {
    const category = task.rejection_category;
    if (category === 'FIXABLE' && to !== 'FIX_REQUIRED') throw new Error('REJECTION_ROUTE_INVALID');
    if (['WRONG_APPROACH', 'OUT_OF_SCOPE'].includes(category) && to !== 'ABORTED') throw new Error('REJECTION_ROUTE_INVALID');
  }

  if (from === 'HUMAN_APPROVED' && to === 'HUMAN_PENDING') {
    if (!context.artifact_changed) throw new Error('APPROVAL_INVALIDATION_REQUIRES_ARTIFACT_CHANGE');
  }

  if (from === 'MERGE_READY' && to === 'HUMAN_PENDING' && !context.policy_revalidation_failed) throw new Error('MERGE_READY_REVOCATION_REQUIRES_POLICY_FAILURE');

  return {
    ...task,
    state: to,
    rejection_category: to === 'HUMAN_REJECTED' ? context.rejection_category : task.rejection_category,
    updated_at: context.now ?? new Date().toISOString(),
    transition: { from, to, reason: context.reason ?? null },
  };
}

export function assertTerminalImmutable(task, requestedState) {
  if (TERMINAL_STATES.includes(task.state) && requestedState !== task.state) throw new Error('TERMINAL_STATE_IMMUTABLE');
  return true;
}
