import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRepoPath,
  normalizeScopePattern,
  pathMatchesScope,
  scopePatternsOverlap,
  validateChangedPaths,
  ScopeLockController,
} from '../../scripts/multi-agent/scope-lock-controller.mjs';

test('repository paths and scope patterns normalize deterministically', () => {
  assert.equal(normalizeRepoPath('./scripts//multi-agent/file.mjs'), 'scripts/multi-agent/file.mjs');
  assert.equal(normalizeRepoPath('scripts\\multi-agent\\file.mjs'), 'scripts/multi-agent/file.mjs');
  assert.equal(normalizeScopePattern('./scripts/multi-agent/**'), 'scripts/multi-agent/**');
  assert.throws(() => normalizeRepoPath('../README.md'), /PATH_TRAVERSAL_FORBIDDEN/);
  assert.throws(() => normalizeRepoPath('/etc/passwd'), /ABSOLUTE_PATH_FORBIDDEN/);
  assert.throws(() => normalizeScopePattern('scripts/*/file.mjs'), /UNSUPPORTED_SCOPE_PATTERN/);
});

test('scope matching supports exact and recursive-prefix scopes', () => {
  assert.equal(pathMatchesScope('package.json', 'package.json'), true);
  assert.equal(pathMatchesScope('scripts/multi-agent/a.mjs', 'scripts/multi-agent/**'), true);
  assert.equal(pathMatchesScope('scripts/multi-agent/nested/a.mjs', 'scripts/multi-agent/**'), true);
  assert.equal(pathMatchesScope('scripts/other/a.mjs', 'scripts/multi-agent/**'), false);
});

test('scope overlap detects exact, prefix and nested conflicts', () => {
  assert.equal(scopePatternsOverlap('package.json', 'package.json'), true);
  assert.equal(scopePatternsOverlap('scripts/multi-agent/a.mjs', 'scripts/multi-agent/**'), true);
  assert.equal(scopePatternsOverlap('scripts/multi-agent/**', 'scripts/**'), true);
  assert.equal(scopePatternsOverlap('scripts/multi-agent/**', 'test/multi-agent/**'), false);
});

test('write-scope validation accepts only declared paths', () => {
  const changed = validateChangedPaths({
    changed_paths: ['test/multi-agent/a.test.mjs', 'scripts/multi-agent/a.mjs'],
    write: ['scripts/multi-agent/**', 'test/multi-agent/**'],
  });
  assert.deepEqual(changed, ['scripts/multi-agent/a.mjs', 'test/multi-agent/a.test.mjs']);
  assert.throws(
    () => validateChangedPaths({ changed_paths: ['README.md'], write: ['scripts/multi-agent/**'] }),
    /OUT_OF_SCOPE:README\.md/,
  );
});

test('forbidden scope takes precedence over declared write scope', () => {
  assert.throws(
    () => validateChangedPaths({
      changed_paths: ['scripts/multi-agent/secret.mjs'],
      write: ['scripts/multi-agent/**'],
      forbidden: ['scripts/multi-agent/secret.mjs'],
    }),
    /FORBIDDEN_SCOPE:scripts\/multi-agent\/secret\.mjs/,
  );
});

test('lock acquisition rejects duplicate IDs and overlapping scopes', () => {
  const controller = new ScopeLockController();
  controller.acquire(
    { lock_id: 'LOCK-1', task_id: 'TASK-1', scopes: ['scripts/multi-agent/**'] },
    { now: '2026-09-14T00:00:00Z' },
  );

  assert.throws(
    () => controller.acquire({ lock_id: 'LOCK-1', task_id: 'TASK-2', scopes: ['test/multi-agent/**'] }),
    /LOCK_ALREADY_EXISTS:LOCK-1/,
  );
  assert.throws(
    () => controller.acquire({ lock_id: 'LOCK-2', task_id: 'TASK-2', scopes: ['scripts/multi-agent/new.mjs'] }),
    /LOCK_CONFLICT:LOCK-1:TASK-1/,
  );

  const independent = controller.acquire(
    { lock_id: 'LOCK-3', task_id: 'TASK-3', scopes: ['test/multi-agent/**'] },
    { now: '2026-09-14T00:00:01Z' },
  );
  assert.equal(independent.lock_id, 'LOCK-3');
});

test('conflict inspection is deterministic and non-mutating', () => {
  const controller = new ScopeLockController();
  controller.acquire({ lock_id: 'LOCK-B', task_id: 'TASK-B', scopes: ['scripts/**'] }, { now: '2026-09-14T00:00:02Z' });
  const conflicts = controller.conflicts(['scripts/multi-agent/**']);
  assert.deepEqual(conflicts, [
    {
      lock_id: 'LOCK-B',
      task_id: 'TASK-B',
      overlaps: [{ existing_scope: 'scripts/**', requested_scope: 'scripts/multi-agent/**' }],
    },
  ]);
  assert.equal(controller.snapshot().length, 1);
});

test('only owner can release and release requires terminal state', () => {
  const controller = new ScopeLockController();
  controller.acquire({ lock_id: 'LOCK-TERM', task_id: 'TASK-TERM', scopes: ['docs/14-multi-agent/**'] });

  assert.throws(
    () => controller.release({ lock_id: 'LOCK-TERM', task_id: 'OTHER', terminal_state: 'MERGED' }),
    /LOCK_OWNER_MISMATCH/,
  );
  assert.throws(
    () => controller.release({ lock_id: 'LOCK-TERM', task_id: 'TASK-TERM', terminal_state: 'IN_PROGRESS' }),
    /LOCK_RELEASE_REQUIRES_TERMINAL_STATE/,
  );

  const released = controller.release(
    { lock_id: 'LOCK-TERM', task_id: 'TASK-TERM', terminal_state: 'MERGED' },
    { now: '2026-09-14T00:00:03Z' },
  );
  assert.equal(released.terminal_state, 'MERGED');
  assert.equal(controller.snapshot().length, 0);
});

test('ABORTED is also a valid terminal release state', () => {
  const controller = new ScopeLockController();
  controller.acquire({ lock_id: 'LOCK-ABORT', task_id: 'TASK-ABORT', scopes: ['test/multi-agent/**'] });
  const released = controller.release({ lock_id: 'LOCK-ABORT', task_id: 'TASK-ABORT', terminal_state: 'ABORTED' });
  assert.equal(released.terminal_state, 'ABORTED');
});

test('snapshot is sorted by lock ID and returns defensive copies', () => {
  const controller = new ScopeLockController();
  controller.acquire({ lock_id: 'LOCK-Z', task_id: 'TASK-Z', scopes: ['z/**'] }, { now: '2026-09-14T00:00:04Z' });
  controller.acquire({ lock_id: 'LOCK-A', task_id: 'TASK-A', scopes: ['a/**'] }, { now: '2026-09-14T00:00:05Z' });

  const snapshot = controller.snapshot();
  assert.deepEqual(snapshot.map((lock) => lock.lock_id), ['LOCK-A', 'LOCK-Z']);
  snapshot[0].scopes.push('mutated/**');
  assert.deepEqual(controller.snapshot()[0].scopes, ['a/**']);
});
