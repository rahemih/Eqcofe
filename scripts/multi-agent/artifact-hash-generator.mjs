import { createHash } from 'node:crypto';
import { normalizeRepoPath } from './scope-lock-controller.mjs';

const OPERATIONS = Object.freeze(['ADD', 'MODIFY', 'DELETE', 'RENAME']);
const OPERATION_SET = new Set(OPERATIONS);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeOperation(value) {
  if (typeof value !== 'string') throw new Error('INVALID_ARTIFACT_OPERATION');
  const operation = value.trim().toUpperCase();
  if (!OPERATION_SET.has(operation)) throw new Error(`INVALID_ARTIFACT_OPERATION:${value}`);
  return operation;
}

function requireExactBytes(value) {
  if (!(value instanceof Uint8Array)) throw new Error('EXACT_FILE_BYTES_REQUIRED');
  return value;
}

export function hashExactBytes(bytes) {
  return sha256(requireExactBytes(bytes));
}

function normalizeChange(change) {
  if (!change || typeof change !== 'object' || Array.isArray(change)) {
    throw new Error('INVALID_ARTIFACT_CHANGE');
  }

  const operation = normalizeOperation(change.operation);
  const normalized_repository_relative_path = normalizeRepoPath(change.path);
  const content_sha256 = hashExactBytes(change.bytes);

  if (operation === 'RENAME') {
    if (typeof change.from_path !== 'string' || change.from_path.trim() === '') {
      throw new Error('RENAME_FROM_PATH_REQUIRED');
    }
    const from_path = normalizeRepoPath(change.from_path);
    if (from_path === normalized_repository_relative_path) {
      throw new Error('RENAME_SOURCE_EQUALS_DESTINATION');
    }
    return {
      operation,
      normalized_repository_relative_path,
      from_path,
      content_sha256,
    };
  }

  if (change.from_path !== undefined && change.from_path !== null) {
    throw new Error('FROM_PATH_ONLY_ALLOWED_FOR_RENAME');
  }

  return {
    operation,
    normalized_repository_relative_path,
    content_sha256,
  };
}

function compareEntries(a, b) {
  return a.normalized_repository_relative_path.localeCompare(b.normalized_repository_relative_path)
    || a.operation.localeCompare(b.operation)
    || (a.from_path ?? '').localeCompare(b.from_path ?? '')
    || a.content_sha256.localeCompare(b.content_sha256);
}

export function buildCanonicalManifest(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error('ARTIFACT_CHANGES_REQUIRED');
  }

  const manifest = changes.map(normalizeChange).sort(compareEntries);
  const destinations = new Set();
  const renameSources = new Set();

  for (const entry of manifest) {
    if (destinations.has(entry.normalized_repository_relative_path)) {
      throw new Error(`DUPLICATE_ARTIFACT_PATH:${entry.normalized_repository_relative_path}`);
    }
    destinations.add(entry.normalized_repository_relative_path);

    if (entry.operation === 'RENAME') {
      if (renameSources.has(entry.from_path)) {
        throw new Error(`DUPLICATE_RENAME_SOURCE:${entry.from_path}`);
      }
      renameSources.add(entry.from_path);
    }
  }

  return deepFreeze(manifest);
}

export function canonicalManifestBytes(manifest) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('CANONICAL_MANIFEST_REQUIRED');
  }
  return Buffer.from(JSON.stringify(manifest), 'utf8');
}

export function buildArtifactBinding({ changes, commit_sha = null }) {
  const manifest = buildCanonicalManifest(changes);
  const canonical_manifest_bytes = canonicalManifestBytes(manifest);
  const artifact_hash = sha256(canonical_manifest_bytes);

  if (commit_sha !== null && (typeof commit_sha !== 'string' || commit_sha.trim() === '')) {
    throw new Error('INVALID_COMMIT_SHA_METADATA');
  }

  return deepFreeze({
    manifest,
    artifact_hash,
    commit_sha,
    manifest_serialization: 'JSON_UTF8_COMPACT_SORTED_V1',
  });
}

export { OPERATIONS };
