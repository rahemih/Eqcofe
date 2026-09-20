import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ScopeLockController, validateChangedPaths } from '../../scripts/multi-agent/scope-lock-controller.mjs';
import { evaluateMergePolicy } from '../../scripts/multi-agent/merge-policy-controller.mjs';
import { buildArtifactBinding } from '../../scripts/multi-agent/artifact-hash-generator.mjs';

const task = JSON.parse(readFileSync(new URL('../../docs/14-multi-agent/tasks/MA-V1-ACC-FAILCLOSED-5C-R2-V16-001.json', import.meta.url), 'utf8'));
const fixture = task.negative_test.fixture;
const allowed = task.scope.write;
const validate = (paths) => validateChangedPaths({ changed_paths: paths, ...task.scope });

test('5C R2 V1.6: declared paths accepted; actual undeclared fixture rejected', () => {
  assert.deepEqual(validate(allowed), [...allowed].sort());
  assert.equal(readFileSync(new URL('../../' + fixture, import.meta.url), 'utf8'), 'TEST_ONLY: fresh V1.6 undeclared inert fixture for Test 5C R2. NEVER MERGE.\n');
  assert.throws(() => validate([...allowed, fixture]), { message: 'OUT_OF_SCOPE:' + fixture });
});

test('5C R2 V1.6: canonical pre-write validation blocks the writer callback', () => {
  let writes = 0;
  const guardedWrite = (paths) => { validate(paths); writes += 1; };
  assert.throws(() => guardedWrite([fixture]), { message: 'OUT_OF_SCOPE:' + fixture });
  assert.equal(writes, 0);
});

test('5C R2 V1.6: canonical lock is limited to declared scope and releases only on terminal abort', () => {
  const controller = new ScopeLockController();
  const identity = { lock_id: task.requested_lock_ids[0], task_id: task.task_id, owner: task.owner };
  controller.acquire({ ...identity, paths: allowed });
  assert.equal(controller.conflicts(allowed).length, 1);
  assert.equal(controller.conflicts([fixture]).length, 0);
  assert.throws(() => controller.release({ ...identity, terminal_state: 'PENDING' }), { message: 'LOCK_RELEASE_REQUIRES_TERMINAL_STATE' });
  assert.equal(controller.release({ ...identity, terminal_state: 'ABORTED' }).status, 'RELEASED');
  assert.equal(controller.snapshot().length, 0);
});

test('5C R2 V1.6: real artifact bytes produce the exact scope merge blocker', () => {
  const changed = [...allowed, fixture];
  const binding = buildArtifactBinding({ changes: changed.map(path => ({
    path, operation: path.endsWith('TASK-CATALOG.md') ? 'MODIFY' : 'ADD',
    bytes: readFileSync(new URL('../../' + path, import.meta.url)),
  })) });
  const result = evaluateMergePolicy({
    task_contract: task, changed_paths: changed, artifact_binding: binding,
    gate_evidence: { current: { LOCK: {
      gate: 'LOCK', task_id: task.task_id, lock_id: task.requested_lock_ids[0],
      owner: task.owner, paths: allowed, status: 'ACTIVE', artifact_hash: binding.artifact_hash,
    } } },
    protection: { passed: true }, require_required_ci: false,
  });
  assert.deepEqual(result.blockers, ['SCOPE:OUT_OF_SCOPE:' + fixture]);
  assert.equal(result.merge_eligible, false);
});
