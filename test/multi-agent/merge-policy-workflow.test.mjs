import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/merge-policy.yml', 'utf8');

function indexOfRequired(fragment) {
  const index = workflow.indexOf(fragment);
  assert.notEqual(index, -1, `missing workflow fragment: ${fragment}`);
  return index;
}

function section(start, end = null) {
  const startIndex = indexOfRequired(start);
  const endIndex = end === null ? workflow.length : indexOfRequired(end);
  assert.ok(startIndex < endIndex, `invalid workflow section: ${start}`);
  return workflow.slice(startIndex, endIndex);
}

const deterministicReviewJob = section('\n  deterministic-review:\n', '\n  merge-policy:\n');
const mergePolicyJob = section('\n  merge-policy:\n', '\n  protection-drift:\n');
const mergeJob = section('\n  merge:\n', '\n  postmerge-verify:\n');
const postmergeJob = section('\n  postmerge-verify:\n', '\n  postmerge-failure:\n');
const failureJob = section('\n  postmerge-failure:\n');

test('deterministic review is a provider-bound predecessor of merge-policy', () => {
  assert.match(deterministicReviewJob, /name: deterministic-primary-review/);
  assert.match(deterministicReviewJob, /merge-policy-controller\.mjs --deterministic-review/);
  assert.match(deterministicReviewJob, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.doesNotMatch(deterministicReviewJob, /issues: write/);
  assert.match(mergePolicyJob, /needs: deterministic-review/);
  assert.match(mergePolicyJob, /always\(\).*github\.event_name == 'pull_request'/);
  assert.match(mergePolicyJob, /checks: read/);
  assert.match(mergePolicyJob, /merge-policy-controller\.mjs --ci-pr/);
});

test('workflow_dispatch merge can revalidate provider-bound review check evidence', () => {
  assert.match(mergeJob, /checks: read/);
});

test('merge job resolves the exact merge SHA from the canonical repository', () => {
  assert.match(mergeJob, /gh api "repos\/\$\{GITHUB_REPOSITORY\}\/pulls\/\$\{PR_NUMBER\}"/);
  assert.match(mergeJob, /test "\$merged" = "true"/);
  assert.match(mergeJob, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(mergeJob, /gh api "repos\/\$\{GITHUB_REPOSITORY\}\/commits\/\$\{merge_sha\}" --silent/);
  assert.match(mergeJob, /merge_sha: \$\{\{ steps\.merged\.outputs\.merge_sha \}\}/);
});

test('pre-merge checkout does not persist write credentials', () => {
  assert.match(mergeJob, /ref: refs\/pull\/\$\{\{ inputs\.pr_number \}\}\/head[\s\S]*?persist-credentials: false/);
});

test('post-merge verification runs in a separate read-only GitHub-hosted job', () => {
  assert.match(postmergeJob, /needs: merge/);
  assert.match(postmergeJob, /runs-on: ubuntu-latest/);
  assert.match(postmergeJob, /timeout-minutes: 30/);
  assert.match(postmergeJob, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(postmergeJob, /contents: write/);
  assert.doesNotMatch(postmergeJob, /pull-requests: write/);
  assert.doesNotMatch(postmergeJob, /issues: write/);
  assert.doesNotMatch(postmergeJob, /GITHUB_TOKEN:/);
});

test('post-merge checkout is canonical-repository exact-SHA bound and credential-free', () => {
  assert.match(postmergeJob, /repository: \$\{\{ github\.repository \}\}/);
  assert.match(postmergeJob, /ref: \$\{\{ needs\.merge\.outputs\.merge_sha \}\}/);
  assert.match(postmergeJob, /persist-credentials: false/);
  assert.match(postmergeJob, /test "\$\(git rev-parse HEAD\)" = "\$\{\{ needs\.merge\.outputs\.merge_sha \}\}"/);
  assert.doesNotMatch(postmergeJob, /ref: main/);
  assert.doesNotMatch(postmergeJob, /refs\/pull/);
});

test('moving main from SHA_1 to SHA_2 cannot retarget post-merge verification', () => {
  const immutableRef = 'ref: ${{ needs.merge.outputs.merge_sha }}';
  assert.ok(postmergeJob.includes(immutableRef));
  assert.equal((postmergeJob.match(/ref: main/g) ?? []).length, 0);
  assert.equal((postmergeJob.match(/github\.ref/g) ?? []).length, 0);
  assert.equal((postmergeJob.match(/github\.sha/g) ?? []).length, 0);
});

test('post-merge verification runs both canonical and Phase A commands', () => {
  assert.match(postmergeJob, /name: postmerge-canonical-verify\n\s+run: pnpm verify/);
  assert.match(postmergeJob, /name: postmerge-phase-a-verify\n\s+run: node scripts\/verify-phase-a\.mjs/);
  assert.match(postmergeJob, /POSTGRES_DB: eqcofe_phase_a/);
  assert.match(postmergeJob, /DATABASE_URL: postgresql:\/\/postgres:postgres@127\.0\.0\.1:5432\/eqcofe_phase_a/);
});

test('post-merge failure is fail-visible, alerts owner and never auto-rolls back', () => {
  assert.match(failureJob, /needs: \[merge, postmerge-verify\]/);
  assert.match(failureJob, /needs\.postmerge-verify\.result != 'success'/);
  assert.match(failureJob, /issues: write/);
  assert.match(failureJob, /incident_state: POST_MERGE_FAILED/);
  assert.match(failureJob, /assignees\[\]=\$\{GITHUB_REPOSITORY_OWNER\}/);
  assert.match(failureJob, /Automatic rollback is prohibited/);
  assert.doesNotMatch(failureJob, /git revert/);
  assert.doesNotMatch(failureJob, /pulls\/.*\/merge/);
});

test('failure reporter does not checkout or execute repository code', () => {
  assert.doesNotMatch(failureJob, /actions\/checkout/);
  assert.doesNotMatch(failureJob, /pnpm /);
  assert.doesNotMatch(failureJob, /node scripts\//);
});
