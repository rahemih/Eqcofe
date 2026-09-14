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

const backendLock = (overrides = {}) => ({
  lock_id: 'LOCK-1',
  task_id: 'TASK-1',
  owner: 'BACKEND',
  paths: ['scripts/multi-agent/**'],
  ...overrides,
});

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

test('lock records include owner, paths, ACTIVE status and created_at', () => {
  const controller = new ScopeLockController();
  const acquired = controller.acquire(backendLock(), { now: '2026-09-14T00:00:00Z' });
  assert.deepEqual(acquired, {
    lock_id: 'LOCK-1',
    task_id: 'TASK-1',
    owner: 'BACKEND',
    paths: ['scripts/multi-agent/**'],
    status: 'ACTIVE',
    created_at: '2026-09-14T00:00:00Z',
  });
});

test('lock acquisition rejects duplicate IDs and overlapping paths', () => {
  const controller = new ScopeLockController();
  controller.acquire(backendLock(), { now: '2026-09-14T00:00:00Z' });

  assert.throws(
    () => controller.acquire(backendLock({ owner: 'FRONTEND', task_id: 'TASK-2', paths: ['test/multi-agent/**'] })),
    /LOCK_ALREADY_EXISTS:LOCK-1/,
  );
  assert.throws(
    () => controller.acquire(backendLock({ lock_id: 'LOCK-2', task_id: 'TASK-2', paths: ['scripts/multi-agent/new.mjs'] })),
    /LOCK_CONFLICT:LOCK-1:TASK-1/,
  );

  const independent = controller.acquire(
    backendLock({ lock_id: 'LOCK-3', task_id: 'TASK-3', paths: ['test/multi-agent/**'] }),
    { now: '2026-09-14T00:00:01Z' },
  );
  assert.equal(independent.lock_id, 'LOCK-3');
});

test('Reviewer and QA roles are read-only and cannot acquire write locks', () => {
  const controller = new ScopeLockController();
  for (const owner of ['REVIEWER', 'QA', 'REVIEWER+QA']) {
    assert.throws(
      () => controller.acquire(backendLock({ lock_id: `LOCK-${owner}`, owner })),
      /LOCK_OWNER_READ_ONLY/,
    );
  }
  assert.equal(controller.snapshot().length, 0);
});

test('conflict inspection is deterministic, frozen and non-mutating', () => {
  const controller = new ScopeLockController();
  controller.acquire(
    backendLock({ lock_id: 'LOCK-B', task_id: 'TASK-B', paths: ['scripts/**'] }),
    { now: '2026-09-14T00:00:02Z' },
  );
  const conflicts = controller.conflicts(['scripts/multi-agent/**']);
  assert.deepEqual(conflicts, [
    {
      lock_id: 'LOCK-B',
      task_id: 'TASK-B',
      owner: 'BACKEND',
      overlaps: [{ existing_path: 'scripts/**', requested_path: 'scripts/multi-agent/**' }],
    },
  ]);
  assert.equal(Object.isFrozen(conflicts), true);
  assert.equal(Object.isFrozen(conflicts[0]), true);
  assert.equal(controller.snapshot().length, 1);
});

test('locks have no automatic timeout and HUMAN_PENDING or STALE cannot release them', () => {
  const controller = new ScopeLockController();
  controller.acquire(backendLock({ lock_id: 'LOCK-NO-TTL', task_id: 'TASK-NO-TTL' }), { now: '2020-01-01T00:00:00Z' });

  assert.throws(
    () => controller.release({
      lock_id: 'LOCK-NO-TTL',
      task_id: 'TASK-NO-TTL',
      owner: 'BACKEND',
      terminal_state: 'HUMAN_PENDING',
    }, { now: '2030-01-01T00:00:00Z' }),
    /LOCK_RELEASE_REQUIRES_TERMINAL_STATE/,
  );
  assert.throws(
    () => controller.release({
      lock_id: 'LOCK-NO-TTL',
      task_id: 'TASK-NO-TTL',
      owner: 'BACKEND',
      terminal_state: 'STALE',
    }, { now: '2031-01-01T00:00:00Z' }),
    /LOCK_RELEASE_REQUIRES_TERMINAL_STATE/,
  );

  const [stillActive] = controller.snapshot();
  assert.equal(stillActive.status, 'ACTIVE');
  assert.equal(stillActive.created_at, '2020-01-01T00:00:00Z');
});

test('only owning task and agent can release and release requires terminal state', () => {
  const controller = new ScopeLockController();
  controller.acquire(backendLock({ lock_id: 'LOCK-TERM', task_id: 'TASK-TERM', paths: ['docs/14-multi-agent/**'] }));

  assert.throws(
    () => controller.release({ lock_id: 'LOCK-TERM', task_id: 'OTHER', owner: 'BACKEND', terminal_state: 'MERGED' }),
    /LOCK_OWNER_MISMATCH/,
  );
  assert.throws(
    () => controller.release({ lock_id: 'LOCK-TERM', task_id: 'TASK-TERM', owner: 'FRONTEND', terminal_state: 'MERGED' }),
    /LOCK_OWNER_MISMATCH/,
  );
  assert.throws(
    () => controller.release({ lock_id: 'LOCK-TERM', task_id: 'TASK-TERM', owner: 'BACKEND', terminal_state: 'IN_PROGRESS' }),
    /LOCK_RELEASE_REQUIRES_TERMINAL_STATE/,
  );

  const released = controller.release(
    { lock_id: 'LOCK-TERM', task_id: 'TASK-TERM', owner: 'BACKEND', terminal_state: 'MERGED' },
    { now: '2026-09-14T00:00:03Z' },
  );
  assert.equal(released.status, 'RELEASED');
  assert.equal(released.released_at, '2026-09-14T00:00:03Z');
  assert.equal(released.terminal_state, 'MERGED');
  assert.equal(controller.snapshot().length, 0);
});

test('ABORTED is also a valid terminal release state', () => {
  const controller = new ScopeLockController();
  controller.acquire(backendLock({ lock_id: 'LOCK-ABORT', task_id: 'TASK-ABORT', paths: ['test/multi-agent/**'] }));
  const released = controller.release({
    lock_id: 'LOCK-ABORT',
    task_id: 'TASK-ABORT',
    owner: 'BACKEND',
    terminal_state: 'ABORTED',
  });
  assert.equal(released.status, 'RELEASED');
  assert.equal(released.terminal_state, 'ABORTED');
});

test('snapshot is sorted, deep-copied and recursively frozen', () => {
  const controller = new ScopeLockController();
  controller.acquire(backendLock({ lock_id: 'LOCK-Z', task_id: 'TASK-Z', paths: ['z/**'] }), { now: '2026-09-14T00:00:04Z' });
  controller.acquire(backendLock({ lock_id: 'LOCK-A', task_id: 'TASK-A', paths: ['a/**'] }), { now: '2026-09-14T00:00:05Z' });

  const snapshot = controller.snapshot();
  assert.deepEqual(snapshot.map((lock) => lock.lock_id), ['LOCK-A', 'LOCK-Z']);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot[0]), true);
  assert.equal(Object.isFrozen(snapshot[0].paths), true);
  assert.throws(() => snapshot[0].paths.push('mutated/**'), TypeError);
  assert.deepEqual(controller.snapshot()[0].paths, ['a/**']);
});
