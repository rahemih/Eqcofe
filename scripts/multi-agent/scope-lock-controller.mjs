const TERMINAL_STATES = new Set(['MERGED', 'ABORTED']);
const READ_ONLY_AGENT_ROLES = new Set(['REVIEWER', 'QA', 'REVIEWER_QA']);

function assertString(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function freezeClone(value) {
  const clone = structuredClone(value);
  const freeze = (entry) => {
    if (!entry || typeof entry !== 'object' || Object.isFrozen(entry)) return entry;
    for (const child of Object.values(entry)) freeze(child);
    return Object.freeze(entry);
  };
  return freeze(clone);
}

export function normalizeRepoPath(value) {
  const raw = assertString(value, 'INVALID_PATH').replaceAll('\\', '/');
  if (raw.includes('\0')) throw new Error('INVALID_PATH');
  if (raw.startsWith('/') || /^[A-Za-z]:\//.test(raw)) throw new Error('ABSOLUTE_PATH_FORBIDDEN');

  const segments = raw.split('/');
  if (segments.some((segment) => segment === '..')) throw new Error('PATH_TRAVERSAL_FORBIDDEN');

  const normalized = segments.filter((segment) => segment !== '' && segment !== '.').join('/');
  if (!normalized) throw new Error('INVALID_PATH');
  if (/[*?\[\]{}]/.test(normalized)) throw new Error('GLOB_NOT_ALLOWED_IN_PATH');
  return normalized;
}

export function normalizeScopePattern(value) {
  const raw = assertString(value, 'INVALID_SCOPE_PATTERN').replaceAll('\\', '/');
  const recursive = raw.endsWith('/**');
  const baseRaw = recursive ? raw.slice(0, -3) : raw;
  if (/[*?\[\]{}]/.test(baseRaw)) throw new Error('UNSUPPORTED_SCOPE_PATTERN');
  const base = normalizeRepoPath(baseRaw);
  return recursive ? `${base}/**` : base;
}

export function pathMatchesScope(filePath, scopePattern) {
  const file = normalizeRepoPath(filePath);
  const scope = normalizeScopePattern(scopePattern);
  if (!scope.endsWith('/**')) return file === scope;
  const base = scope.slice(0, -3);
  return file === base || file.startsWith(`${base}/`);
}

export function scopePatternsOverlap(leftPattern, rightPattern) {
  const left = normalizeScopePattern(leftPattern);
  const right = normalizeScopePattern(rightPattern);
  const leftRecursive = left.endsWith('/**');
  const rightRecursive = right.endsWith('/**');

  if (!leftRecursive && !rightRecursive) return left === right;
  if (leftRecursive && !rightRecursive) return pathMatchesScope(right, left);
  if (!leftRecursive && rightRecursive) return pathMatchesScope(left, right);

  const leftBase = left.slice(0, -3);
  const rightBase = right.slice(0, -3);
  return leftBase === rightBase || leftBase.startsWith(`${rightBase}/`) || rightBase.startsWith(`${leftBase}/`);
}

function normalizePatterns(patterns, code) {
  if (!Array.isArray(patterns) || patterns.length === 0) throw new Error(code);
  return [...new Set(patterns.map(normalizeScopePattern))].sort();
}

function normalizeAgentRole(value) {
  const role = assertString(value, 'LOCK_OWNER_REQUIRED')
    .toUpperCase()
    .replace(/[+\s/-]+/g, '_');
  if (READ_ONLY_AGENT_ROLES.has(role)) throw new Error(`LOCK_OWNER_READ_ONLY:${role}`);
  return role;
}

export function validateChangedPaths({ changed_paths, write, forbidden = [] }) {
  if (!Array.isArray(changed_paths)) throw new Error('INVALID_CHANGED_PATHS');
  const normalizedWrite = normalizePatterns(write, 'WRITE_SCOPE_REQUIRED');
  const normalizedForbidden = Array.isArray(forbidden)
    ? [...new Set(forbidden.map(normalizeScopePattern))].sort()
    : (() => { throw new Error('INVALID_FORBIDDEN_SCOPE'); })();

  const changed = [...new Set(changed_paths.map(normalizeRepoPath))].sort();
  for (const file of changed) {
    if (normalizedForbidden.some((pattern) => pathMatchesScope(file, pattern))) {
      throw new Error(`FORBIDDEN_SCOPE:${file}`);
    }
    if (!normalizedWrite.some((pattern) => pathMatchesScope(file, pattern))) {
      throw new Error(`OUT_OF_SCOPE:${file}`);
    }
  }
  return changed;
}

function normalizeLockInput(lock) {
  if (!lock || typeof lock !== 'object') throw new Error('INVALID_LOCK');
  const lock_id = assertString(lock.lock_id, 'LOCK_ID_REQUIRED');
  const task_id = assertString(lock.task_id, 'TASK_ID_REQUIRED');
  const owner = normalizeAgentRole(lock.owner);
  const paths = normalizePatterns(lock.paths, 'LOCK_PATHS_REQUIRED');
  return { lock_id, task_id, owner, paths };
}

/**
 * Deterministic in-memory write-lock controller.
 *
 * Lock lifecycle invariants:
 * - locks have no TTL and no automatic timeout;
 * - HUMAN_PENDING, STALE, and every other non-terminal state keep the lock ACTIVE;
 * - only explicit release by the owning task/agent after MERGED or ABORTED removes an active lock;
 * - REVIEWER and QA roles are read-only and cannot acquire write locks;
 * - snapshots/conflict views are deep-cloned and recursively frozen read-only views.
 */
export class ScopeLockController {
  #locks = new Map();

  acquire(lock, context = {}) {
    const normalized = normalizeLockInput(lock);
    if (this.#locks.has(normalized.lock_id)) throw new Error(`LOCK_ALREADY_EXISTS:${normalized.lock_id}`);

    for (const existing of this.#locks.values()) {
      for (const requestedPath of normalized.paths) {
        for (const existingPath of existing.paths) {
          if (scopePatternsOverlap(requestedPath, existingPath)) {
            throw new Error(`LOCK_CONFLICT:${existing.lock_id}:${existing.task_id}:${existingPath}<->${requestedPath}`);
          }
        }
      }
    }

    const record = {
      ...normalized,
      status: 'ACTIVE',
      created_at: context.now ?? new Date().toISOString(),
    };
    this.#locks.set(record.lock_id, record);
    return freezeClone(record);
  }

  release({ lock_id, task_id, owner, terminal_state }, context = {}) {
    const id = assertString(lock_id, 'LOCK_ID_REQUIRED');
    const task = assertString(task_id, 'TASK_ID_REQUIRED');
    const agent = assertString(owner, 'LOCK_OWNER_REQUIRED')
      .toUpperCase()
      .replace(/[+\s/-]+/g, '_');
    const existing = this.#locks.get(id);
    if (!existing) throw new Error(`LOCK_NOT_FOUND:${id}`);
    if (existing.task_id !== task || existing.owner !== agent) throw new Error(`LOCK_OWNER_MISMATCH:${id}`);
    if (!TERMINAL_STATES.has(terminal_state)) throw new Error('LOCK_RELEASE_REQUIRES_TERMINAL_STATE');

    this.#locks.delete(id);
    return freezeClone({
      ...existing,
      status: 'RELEASED',
      released_at: context.now ?? new Date().toISOString(),
      terminal_state,
    });
  }

  conflicts(paths) {
    const requested = normalizePatterns(paths, 'LOCK_PATHS_REQUIRED');
    const conflicts = [];
    for (const existing of this.#locks.values()) {
      const overlaps = [];
      for (const requestedPath of requested) {
        for (const existingPath of existing.paths) {
          if (scopePatternsOverlap(requestedPath, existingPath)) {
            overlaps.push({ existing_path: existingPath, requested_path: requestedPath });
          }
        }
      }
      if (overlaps.length) {
        conflicts.push({
          lock_id: existing.lock_id,
          task_id: existing.task_id,
          owner: existing.owner,
          overlaps,
        });
      }
    }
    conflicts.sort((a, b) => a.lock_id.localeCompare(b.lock_id));
    return freezeClone(conflicts);
  }

  snapshot() {
    const snapshot = [...this.#locks.values()]
      .map((lock) => structuredClone(lock))
      .sort((a, b) => a.lock_id.localeCompare(b.lock_id));
    return freezeClone(snapshot);
  }
}
