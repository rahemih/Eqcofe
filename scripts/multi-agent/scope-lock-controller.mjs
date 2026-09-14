const TERMINAL_STATES = new Set(['MERGED', 'ABORTED']);

function assertString(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
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
  const scopes = normalizePatterns(lock.scopes, 'LOCK_SCOPE_REQUIRED');
  return { lock_id, task_id, scopes };
}

export class ScopeLockController {
  #locks = new Map();

  acquire(lock, context = {}) {
    const normalized = normalizeLockInput(lock);
    if (this.#locks.has(normalized.lock_id)) throw new Error(`LOCK_ALREADY_EXISTS:${normalized.lock_id}`);

    for (const existing of this.snapshot()) {
      for (const requestedScope of normalized.scopes) {
        for (const existingScope of existing.scopes) {
          if (scopePatternsOverlap(requestedScope, existingScope)) {
            throw new Error(`LOCK_CONFLICT:${existing.lock_id}:${existing.task_id}:${existingScope}<->${requestedScope}`);
          }
        }
      }
    }

    const record = {
      ...normalized,
      acquired_at: context.now ?? new Date().toISOString(),
    };
    this.#locks.set(record.lock_id, record);
    return structuredClone(record);
  }

  release({ lock_id, task_id, terminal_state }, context = {}) {
    const id = assertString(lock_id, 'LOCK_ID_REQUIRED');
    const owner = assertString(task_id, 'TASK_ID_REQUIRED');
    const existing = this.#locks.get(id);
    if (!existing) throw new Error(`LOCK_NOT_FOUND:${id}`);
    if (existing.task_id !== owner) throw new Error(`LOCK_OWNER_MISMATCH:${id}`);
    if (!TERMINAL_STATES.has(terminal_state)) throw new Error('LOCK_RELEASE_REQUIRES_TERMINAL_STATE');

    this.#locks.delete(id);
    return {
      ...structuredClone(existing),
      released_at: context.now ?? new Date().toISOString(),
      terminal_state,
    };
  }

  conflicts(scopes) {
    const requested = normalizePatterns(scopes, 'LOCK_SCOPE_REQUIRED');
    const conflicts = [];
    for (const existing of this.snapshot()) {
      const overlaps = [];
      for (const requestedScope of requested) {
        for (const existingScope of existing.scopes) {
          if (scopePatternsOverlap(requestedScope, existingScope)) {
            overlaps.push({ existing_scope: existingScope, requested_scope: requestedScope });
          }
        }
      }
      if (overlaps.length) conflicts.push({ lock_id: existing.lock_id, task_id: existing.task_id, overlaps });
    }
    return conflicts;
  }

  snapshot() {
    return [...this.#locks.values()]
      .map((lock) => structuredClone(lock))
      .sort((a, b) => a.lock_id.localeCompare(b.lock_id));
  }
}
