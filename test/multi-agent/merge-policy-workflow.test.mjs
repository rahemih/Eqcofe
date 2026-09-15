import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/merge-policy.yml', 'utf8');

function indexOfRequired(fragment) {
  const index = workflow.indexOf(fragment);
  assert.notEqual(index, -1, `missing workflow fragment: ${fragment}`);
  return index;
}

test('deterministic merge workflow verifies the exact merged commit after merge', () => {
  const execute = indexOfRequired('name: deterministic-merge-policy-execution');
  const resolve = indexOfRequired('name: resolve-exact-merge-sha');
  const checkout = indexOfRequired('name: checkout-exact-merge-sha');
  const exactRef = indexOfRequired('ref: ${{ steps.merged.outputs.merge_sha }}');
  const verifyCheckout = indexOfRequired('name: verify-exact-merge-checkout');
  const canonicalVerify = indexOfRequired('name: postmerge-canonical-verify');
  const phaseAVerify = indexOfRequired('name: postmerge-phase-a-verify');

  assert.ok(execute < resolve);
  assert.ok(resolve < checkout);
  assert.ok(checkout <= exactRef);
  assert.ok(exactRef < verifyCheckout);
  assert.ok(verifyCheckout < canonicalVerify);
  assert.ok(canonicalVerify < phaseAVerify);
});

test('post-merge verification runs both canonical and Phase A commands', () => {
  assert.match(workflow, /name: postmerge-canonical-verify\n\s+run: pnpm verify/);
  assert.match(workflow, /name: postmerge-phase-a-verify\n\s+run: node scripts\/verify-phase-a\.mjs/);
  assert.match(workflow, /POSTGRES_DB: eqcofe_phase_a/);
  assert.match(workflow, /DATABASE_URL: postgresql:\/\/postgres:postgres@127\.0\.0\.1:5432\/eqcofe_phase_a/);
});

test('merge SHA is resolved from the merged PR and validated as a full SHA', () => {
  assert.match(workflow, /gh api "repos\/\$\{GITHUB_REPOSITORY\}\/pulls\/\$\{PR_NUMBER\}"/);
  assert.match(workflow, /test "\$merged" = "true"/);
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(workflow, /echo "merge_sha=\$merge_sha" >> "\$GITHUB_OUTPUT"/);
});
