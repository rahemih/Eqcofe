import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPERATIONS,
  hashExactBytes,
  buildCanonicalManifest,
  canonicalManifestBytes,
  buildArtifactBinding,
} from '../../scripts/multi-agent/artifact-hash-generator.mjs';

const bytes = (value) => Buffer.from(value, 'utf8');
const sha40a = 'a'.repeat(40);
const sha40b = 'b'.repeat(40);

test('known SHA256 vector proves exact-byte hashing', () => {
  assert.equal(
    hashExactBytes(bytes('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  assert.throws(() => hashExactBytes('abc'), /EXACT_FILE_BYTES_REQUIRED/);
});

test('LF versus CRLF changes content and artifact hash', () => {
  const lf = buildArtifactBinding({ changes: [{ operation: 'MODIFY', path: 'a.txt', bytes: bytes('a\nb\n') }] });
  const crlf = buildArtifactBinding({ changes: [{ operation: 'MODIFY', path: 'a.txt', bytes: bytes('a\r\nb\r\n') }] });
  assert.notEqual(lf.manifest[0].content_sha256, crlf.manifest[0].content_sha256);
  assert.notEqual(lf.artifact_hash, crlf.artifact_hash);
});

test('one binary byte difference changes artifact hash', () => {
  const a = buildArtifactBinding({ changes: [{ operation: 'ADD', path: 'bin.dat', bytes: Buffer.from([0, 1, 2]) }] });
  const b = buildArtifactBinding({ changes: [{ operation: 'ADD', path: 'bin.dat', bytes: Buffer.from([0, 1, 3]) }] });
  assert.notEqual(a.artifact_hash, b.artifact_hash);
});

test('canonical manifest is input-order independent', () => {
  const first = [
    { operation: 'ADD', path: 'z.txt', bytes: bytes('z') },
    { operation: 'MODIFY', path: 'a.txt', bytes: bytes('a') },
  ];
  const second = [...first].reverse();
  const a = buildArtifactBinding({ changes: first });
  const b = buildArtifactBinding({ changes: second });
  assert.deepEqual(a.manifest, b.manifest);
  assert.equal(a.artifact_hash, b.artifact_hash);
  assert.equal(a.manifest[0].normalized_repository_relative_path, 'a.txt');
});

test('operation changes invalidate artifact binding', () => {
  const add = buildArtifactBinding({ changes: [{ operation: 'ADD', path: 'a.txt', bytes: bytes('same') }] });
  const modify = buildArtifactBinding({ changes: [{ operation: 'MODIFY', path: 'a.txt', bytes: bytes('same') }] });
  assert.notEqual(add.artifact_hash, modify.artifact_hash);
});

test('all frozen operations are supported and DELETE binds supplied pre-change bytes', () => {
  assert.deepEqual(OPERATIONS, ['ADD', 'MODIFY', 'DELETE', 'RENAME']);
  const deletedA = buildArtifactBinding({ changes: [{ operation: 'DELETE', path: 'gone.txt', bytes: bytes('before-A') }] });
  const deletedB = buildArtifactBinding({ changes: [{ operation: 'DELETE', path: 'gone.txt', bytes: bytes('before-B') }] });
  assert.equal(deletedA.manifest[0].operation, 'DELETE');
  assert.notEqual(deletedA.artifact_hash, deletedB.artifact_hash);
});

test('RENAME binds source path, destination path and current content bytes', () => {
  const base = buildArtifactBinding({ changes: [{
    operation: 'RENAME', from_path: 'old/name.txt', path: 'new/name.txt', bytes: bytes('content'),
  }] });
  assert.equal(base.manifest[0].from_path, 'old/name.txt');
  assert.equal(base.manifest[0].normalized_repository_relative_path, 'new/name.txt');

  const otherSource = buildArtifactBinding({ changes: [{
    operation: 'RENAME', from_path: 'older/name.txt', path: 'new/name.txt', bytes: bytes('content'),
  }] });
  assert.notEqual(base.artifact_hash, otherSource.artifact_hash);
  assert.throws(() => buildArtifactBinding({ changes: [{ operation: 'RENAME', path: 'new.txt', bytes: bytes('x') }] }), /RENAME_FROM_PATH_REQUIRED/);
  assert.throws(() => buildArtifactBinding({ changes: [{ operation: 'RENAME', from_path: 'same.txt', path: 'same.txt', bytes: bytes('x') }] }), /RENAME_SOURCE_EQUALS_DESTINATION/);
});

test('repository paths normalize deterministically and unsafe paths fail closed', () => {
  const result = buildArtifactBinding({ changes: [{ operation: 'ADD', path: './dir\\file.txt', bytes: bytes('x') }] });
  assert.equal(result.manifest[0].normalized_repository_relative_path, 'dir/file.txt');
  assert.throws(() => buildArtifactBinding({ changes: [{ operation: 'ADD', path: '../escape.txt', bytes: bytes('x') }] }), /PATH_TRAVERSAL_FORBIDDEN/);
  assert.throws(() => buildArtifactBinding({ changes: [{ operation: 'ADD', path: '/absolute.txt', bytes: bytes('x') }] }), /ABSOLUTE_PATH_FORBIDDEN/);
});

test('duplicate normalized destinations and duplicate rename sources fail closed', () => {
  assert.throws(() => buildCanonicalManifest([
    { operation: 'ADD', path: './x.txt', bytes: bytes('one') },
    { operation: 'MODIFY', path: 'x.txt', bytes: bytes('two') },
  ]), /DUPLICATE_ARTIFACT_PATH:x\.txt/);

  assert.throws(() => buildCanonicalManifest([
    { operation: 'RENAME', from_path: 'old.txt', path: 'one.txt', bytes: bytes('x') },
    { operation: 'RENAME', from_path: 'old.txt', path: 'two.txt', bytes: bytes('x') },
  ]), /DUPLICATE_RENAME_SOURCE/);
});

test('commit SHA is traceability metadata only and never changes artifact hash', () => {
  const changes = [{ operation: 'MODIFY', path: 'a.txt', bytes: bytes('same') }];
  const a = buildArtifactBinding({ changes, commit_sha: sha40a });
  const b = buildArtifactBinding({ changes, commit_sha: sha40b });
  assert.equal(a.artifact_hash, b.artifact_hash);
  assert.equal(a.commit_sha, sha40a);
  assert.equal(b.commit_sha, sha40b);
});

test('canonical manifest serialization is compact UTF-8 JSON and stable', () => {
  const manifest = buildCanonicalManifest([{ operation: 'ADD', path: 'a.txt', bytes: bytes('x') }]);
  const encoded = canonicalManifestBytes(manifest);
  assert.equal(Buffer.isBuffer(encoded), true);
  assert.equal(encoded.toString('utf8'), JSON.stringify(manifest));
  assert.equal(encoded.includes(0x0a), false);
});

test('malformed operations, from_path misuse and empty changes fail closed', () => {
  assert.throws(() => buildArtifactBinding({ changes: [] }), /ARTIFACT_CHANGES_REQUIRED/);
  assert.throws(() => buildArtifactBinding({ changes: [{ operation: 'COPY', path: 'a.txt', bytes: bytes('x') }] }), /INVALID_ARTIFACT_OPERATION/);
  assert.throws(() => buildArtifactBinding({ changes: [{ operation: 'ADD', path: 'a.txt', from_path: 'b.txt', bytes: bytes('x') }] }), /FROM_PATH_ONLY_ALLOWED_FOR_RENAME/);
});

test('binding evidence is recursively immutable', () => {
  const result = buildArtifactBinding({ changes: [{ operation: 'RENAME', from_path: 'old.txt', path: 'new.txt', bytes: bytes('x') }] });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.manifest), true);
  assert.equal(Object.isFrozen(result.manifest[0]), true);
});
