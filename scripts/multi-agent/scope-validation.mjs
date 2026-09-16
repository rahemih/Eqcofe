import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { normalizeRepoPath, validateChangedPaths } from './scope-lock-controller.mjs';

const execFile = promisify(execFileCallback);
const TASK_PATH_RE = /^docs\/14-multi-agent\/tasks\/[A-Za-z0-9._-]+\.json$/;

function fail(code) { throw new Error(code); }
function nonEmpty(value, code) { if (typeof value !== 'string' || value.trim() === '') fail(code); return value.trim(); }
function sha(value, code) { const out=nonEmpty(value,code); if(!/^[0-9a-f]{40}$/.test(out)) fail(code); return out; }

export function validateTaskContractShape(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) fail('INVALID_TASK_CONTRACT');
  nonEmpty(task.task_id, 'TASK_ID_REQUIRED');
  if (!task.scope || typeof task.scope !== 'object') fail('TASK_SCOPE_REQUIRED');
  if (!Array.isArray(task.scope.write) || task.scope.write.length === 0) fail('WRITE_SCOPE_REQUIRED');
  if (!Array.isArray(task.scope.forbidden)) fail('INVALID_FORBIDDEN_SCOPE');
  return task;
}

export async function loadTaskContract(taskPath, cwd = process.cwd()) {
  const normalized = normalizeRepoPath(taskPath);
  if (!TASK_PATH_RE.test(normalized)) fail('INVALID_TASK_CONTRACT_PATH');
  return validateTaskContractShape(JSON.parse(await readFile(path.join(cwd, ...normalized.split('/')), 'utf8')));
}

export function validateExplicitPaths(task, paths) {
  validateTaskContractShape(task);
  return validateChangedPaths({ changed_paths: paths, write: task.scope.write, forbidden: task.scope.forbidden });
}

export function parseNameStatus(text) {
  const paths = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine) continue;
    const parts = rawLine.split('\t');
    const status = parts[0];
    if (/^[RC]\d*$/.test(status)) {
      if (parts.length !== 3) fail(`INVALID_GIT_NAME_STATUS:${rawLine}`);
      paths.push(normalizeRepoPath(parts[1]), normalizeRepoPath(parts[2]));
    } else if (/^[AMDMTUXB]$/.test(status)) {
      if (parts.length !== 2) fail(`INVALID_GIT_NAME_STATUS:${rawLine}`);
      paths.push(normalizeRepoPath(parts[1]));
    } else {
      fail(`UNSUPPORTED_GIT_STATUS:${status}`);
    }
  }
  return [...new Set(paths)].sort();
}

async function git(args, cwd) {
  const { stdout } = await execFile('git', args, { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

export async function ensureCommitAvailable(commitSha, cwd = process.cwd()) {
  const commit = sha(commitSha, 'INVALID_COMMIT_SHA');
  try { await git(['cat-file', '-e', `${commit}^{commit}`], cwd); return; } catch {}
  await git(['fetch', '--no-tags', '--depth=256', 'origin', commit], cwd);
  await git(['cat-file', '-e', `${commit}^{commit}`], cwd);
}

export async function listBranchOnlyCommits(baseSha, headSha, cwd = process.cwd()) {
  const base = sha(baseSha, 'INVALID_BASE_SHA');
  const head = sha(headSha, 'INVALID_HEAD_SHA');
  const output = await git(['rev-list', '--reverse', `${base}..${head}`], cwd);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

export async function changedPathsForCommit(commitSha, cwd = process.cwd()) {
  const commit = sha(commitSha, 'INVALID_COMMIT_SHA');
  let parent;
  try { parent = await git(['rev-parse', `${commit}^1`], cwd); } catch { parent = null; }
  const args = parent
    ? ['diff', '--name-status', '-M', parent, commit]
    : ['diff-tree', '--root', '--no-commit-id', '--name-status', '-r', '-M', commit];
  return parseNameStatus(await git(args, cwd));
}

export async function validateCommitHistory({ task, base_sha, head_sha, cwd = process.cwd() }) {
  validateTaskContractShape(task);
  const base = sha(base_sha, 'INVALID_BASE_SHA');
  const head = sha(head_sha, 'INVALID_HEAD_SHA');
  const commits = await listBranchOnlyCommits(base, head, cwd);
  if (commits.length === 0) fail('NO_BRANCH_ONLY_COMMITS');
  const evidence = [];
  for (const commit of commits) {
    const changed_paths = await changedPathsForCommit(commit, cwd);
    try {
      const normalized = validateExplicitPaths(task, changed_paths);
      evidence.push(Object.freeze({ commit, changed_paths: normalized }));
    } catch (error) {
      throw new Error(`SCOPE_HISTORY_VIOLATION:${commit}:${error.message}`);
    }
  }
  return Object.freeze(evidence);
}

export function taskContractPathFromPullRequestBody(body) {
  const text = typeof body === 'string' ? body : '';
  const matches = [...text.matchAll(/Task Contract:\s*`([^`]+)`/g)].map((match) => match[1]);
  if (matches.length !== 1) fail('PR_TASK_CONTRACT_REFERENCE_REQUIRED');
  const normalized = normalizeRepoPath(matches[0]);
  if (!TASK_PATH_RE.test(normalized)) fail('INVALID_TASK_CONTRACT_PATH');
  return normalized;
}

export async function pullRequestContextFromEvent(eventPath = process.env.GITHUB_EVENT_PATH) {
  const file = nonEmpty(eventPath, 'GITHUB_EVENT_PATH_REQUIRED');
  const event = JSON.parse(await readFile(file, 'utf8'));
  const pr = event.pull_request;
  if (!pr) fail('PULL_REQUEST_EVENT_REQUIRED');
  const base_sha = sha(pr.base?.sha, 'INVALID_BASE_SHA');
  const head_sha = sha(pr.head?.sha, 'INVALID_HEAD_SHA');
  const task_contract_path = taskContractPathFromPullRequestBody(pr.body);
  return Object.freeze({ base_sha, head_sha, task_contract_path });
}

async function cli(args) {
  const taskIndex = args.indexOf('--task');
  if (taskIndex < 0 || !args[taskIndex + 1]) fail('TASK_PATH_REQUIRED');
  const taskPath = args[taskIndex + 1];
  const task = await loadTaskContract(taskPath);
  const pathValues = [];
  for (let i=0;i<args.length;i+=1) if(args[i]==='--path' && args[i+1]) pathValues.push(args[++i]);
  if (pathValues.length) {
    console.log(JSON.stringify({ status: 'PASS', changed_paths: validateExplicitPaths(task, pathValues) }));
    return;
  }
  const baseIndex=args.indexOf('--base'); const headIndex=args.indexOf('--head');
  if(baseIndex<0||headIndex<0||!args[baseIndex+1]||!args[headIndex+1]) fail('PATH_OR_RANGE_REQUIRED');
  const evidence=await validateCommitHistory({task,base_sha:args[baseIndex+1],head_sha:args[headIndex+1]});
  console.log(JSON.stringify({status:'PASS',commits:evidence}));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cli(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
