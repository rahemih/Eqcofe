import test from 'node:test';
import assert from 'node:assert/strict';
import { ScopeLockController } from '../../scripts/multi-agent/scope-lock-controller.mjs';

function lock(overrides = {}) {
  return {
    lock_id: 'LOCK-A',
    task_id: 'TASK-A',
    owner: 'BACKEND',
    paths: ['docs/14-multi-agent/tasks/EXACT.json'],
    ...overrides,
  };
}

test('Test 4 exact overlap is blocked', () => {
  const controller = new ScopeLockController();
  controller.acquire(lock());
  assert.throws(
    () => controller.acquire(lock({
      lock_id: 'LOCK-B',
      task_id: 'TASK-B',
      paths: ['docs/14-multi-agent/tasks/EXACT.json'],
    })),
    /LOCK_CONFLICT:LOCK-A:TASK-A/,
  );
});

test('Test 4 prefix overlap is blocked', () => {
  const controller = new ScopeLockController();
  controller.acquire(lock({ paths: ['scripts/multi-agent/**'] }));
  assert.throws(
    () => controller.acquire(lock({
      lock_id: 'LOCK-B',
      task_id: 'TASK-B',
      paths: ['scripts/multi-agent/new.mjs'],
    })),
    /LOCK_CONFLICT:LOCK-A:TASK-A/,
  );
});

test('Test 4 nested overlap is blocked', () => {
  const controller = new ScopeLockController();
  controller.acquire(lock({ paths: ['scripts/**'] }));
  assert.throws(
    () => controller.acquire(lock({
      lock_id: 'LOCK-B',
      task_id: 'TASK-B',
      paths: ['scripts/multi-agent/**'],
    })),
    /LOCK_CONFLICT:LOCK-A:TASK-A/,
  );
});

test('Test 4 normalized collision is blocked', () => {
  const controller = new ScopeLockController();
  controller.acquire(lock({ paths: ['./scripts//multi-agent/**'] }));
  assert.throws(
    () => controller.acquire(lock({
      lock_id: 'LOCK-B',
      task_id: 'TASK-B',
      paths: ['scripts\\multi-agent\\new.mjs'],
    })),
    /LOCK_CONFLICT:LOCK-A:TASK-A/,
  );
});

test('Test 4 traversal attempt is rejected before acquisition', () => {
  const controller = new ScopeLockController();
  assert.throws(
    () => controller.acquire(lock({ paths: ['../scripts/multi-agent/**'] })),
    /PATH_TRAVERSAL_FORBIDDEN/,
  );
  assert.equal(controller.snapshot().length, 0);
});

test('Test 4 foreign release is rejected and lock remains active', () => {
  const controller = new ScopeLockController();
  controller.acquire(lock({ paths: ['docs/14-multi-agent/**'] }));
  assert.throws(
    () => controller.release({
      lock_id: 'LOCK-A',
      task_id: 'TASK-FOREIGN',
      owner: 'BACKEND',
      terminal_state: 'MERGED',
    }),
    /LOCK_OWNER_MISMATCH:LOCK-A/,
  );
  assert.throws(
    () => controller.release({
      lock_id: 'LOCK-A',
      task_id: 'TASK-A',
      owner: 'FRONTEND',
      terminal_state: 'MERGED',
    }),
    /LOCK_OWNER_MISMATCH:LOCK-A/,
  );
  assert.equal(controller.snapshot()[0].status, 'ACTIVE');
});

test('Test 4 valid terminal release succeeds only for owning task and agent', () => {
  const controller = new ScopeLockController();
  controller.acquire(lock({ paths: ['docs/14-multi-agent/**'] }), {
    now: '2026-09-20T00:00:00Z',
  });
  const released = controller.release({
    lock_id: 'LOCK-A',
    task_id: 'TASK-A',
    owner: 'BACKEND',
    terminal_state: 'MERGED',
  }, {
    now: '2026-09-20T00:00:01Z',
  });
  assert.equal(released.status, 'RELEASED');
  assert.equal(released.terminal_state, 'MERGED');
  assert.equal(controller.snapshot().length, 0);
});
