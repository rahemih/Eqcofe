import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildArtifactBinding } from './artifact-hash-generator.mjs';
import {
  normalizeScopePattern,
  validateChangedPaths,
} from './scope-lock-controller.mjs';
import {
  classifyRisk,
  maxRisk,
  normalizeRisk,
  verificationPolicyForRisk,
} from './risk-verification-policy.mjs';

export const GATE_PROTOCOL = 'EQCOFE_GATE_V1';
export const REQUIRED_BASE_CHECKS = Object.freeze(['verify', 'phase-a']);
const GATE_TYPES = new Set(['REVIEW', 'SECURITY', 'HUMAN', 'LOCK']);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value;
}

function assertString(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function assertArray(value, code) {
  if (!Array.isArray(value)) throw new Error(code);
  return value;
}

function normalizeStatus(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function normalizedWriteScope(contract) {
  return uniqueSorted(assertArray(contract.scope?.write, 'TASK_WRITE_SCOPE_REQUIRED').map(normalizeScopePattern));
}

function normalizeContract(contract) {
  assertObject(contract, 'TASK_CONTRACT_REQUIRED');
  assertString(contract.task_id, 'TASK_ID_REQUIRED');
  assertObject(contract.scope, 'TASK_SCOPE_REQUIRED');
  assertArray(contract.scope.write, 'TASK_WRITE_SCOPE_REQUIRED');
  assertArray(contract.scope.forbidden, 'TASK_FORBIDDEN_SCOPE_REQUIRED');
  assertArray(contract.requested_lock_ids, 'TASK_LOCK_IDS_REQUIRED');
  if (contract.requested_lock_ids.length === 0) throw new Error('TASK_LOCK_IDS_REQUIRED');
  normalizeRisk(contract.risk);
  normalizeRisk(contract.risk_floor);
  if (typeof contract.human_gate_required !== 'boolean') throw new Error('TASK_HUMAN_GATE_REQUIRED');
  return contract;
}

export function formatGateEvidence(payload) {
  const normalized = assertObject(payload, 'GATE_EVIDENCE_REQUIRED');
  return `<!-- ${GATE_PROTOCOL} ${JSON.stringify(normalized)} -->`;
}

export function parseGateEvidence(comments, { task_id, artifact_hash }) {
  const taskId = assertString(task_id, 'TASK_ID_REQUIRED');
  const artifactHash = assertString(artifact_hash, 'ARTIFACT_HASH_REQUIRED');
  const current = {};
  const stale = [];
  const malformed = [];
  const pattern = new RegExp(`<!--\\s*${GATE_PROTOCOL}\\s+({[\\s\\S]*?})\\s*-->`, 'g');

  for (const comment of assertArray(comments, 'COMMENTS_REQUIRED')) {
    const body = typeof comment?.body === 'string' ? comment.body : '';
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(body)) !== null) {
      let payload;
      try {
        payload = JSON.parse(match[1]);
      } catch {
        malformed.push({ comment_id: comment?.id ?? null, reason: 'INVALID_JSON' });
        continue;
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        malformed.push({ comment_id: comment?.id ?? null, reason: 'INVALID_PAYLOAD' });
        continue;
      }
      const gate = normalizeStatus(payload.gate);
      if (!GATE_TYPES.has(gate) || payload.task_id !== taskId) continue;
      const record = {
        ...payload,
        gate,
        author_login: comment?.user?.login ?? null,
        comment_id: comment?.id ?? null,
        created_at: comment?.created_at ?? null,
      };
      if (payload.artifact_hash !== artifactHash) {
        stale.push(record);
        continue;
      }
      const previous = current[gate];
      if (!previous || Number(record.comment_id ?? 0) >= Number(previous.comment_id ?? 0)) current[gate] = record;
    }
  }

  return deepFreeze({ current, stale, malformed });
}

function gatePass(record, expectedStatus) {
  return Boolean(record && normalizeStatus(record.status) === expectedStatus);
}

function validateLockEvidence(record, contract, artifactHash) {
  if (!record) return ['LOCK_EVIDENCE_MISSING'];
  const blockers = [];
  if (normalizeStatus(record.status) !== 'ACTIVE') blockers.push('LOCK_NOT_ACTIVE');
  if (record.artifact_hash !== artifactHash) blockers.push('LOCK_ARTIFACT_MISMATCH');
  if (!contract.requested_lock_ids.includes(record.lock_id)) blockers.push('LOCK_ID_NOT_REQUESTED');
  if (record.task_id !== contract.task_id) blockers.push('LOCK_TASK_MISMATCH');
  if (normalizeStatus(record.owner) !== normalizeStatus(contract.owner)) blockers.push('LOCK_OWNER_MISMATCH');
  try {
    const expected = normalizedWriteScope(contract);
    const actual = uniqueSorted(assertArray(record.paths, 'LOCK_PATHS_REQUIRED').map(normalizeScopePattern));
    if (JSON.stringify(expected) !== JSON.stringify(actual)) blockers.push('LOCK_SCOPE_MISMATCH');
  } catch {
    blockers.push('LOCK_SCOPE_INVALID');
  }
  return blockers;
}

export function evaluateMergePolicy({
  task_contract,
  changed_paths,
  artifact_binding,
  project_map = { sensitive_zones: [] },
  gate_evidence = { current: {} },
  protection,
  required_ci = {},
  require_required_ci = true,
}) {
  const contract = normalizeContract(task_contract);
  const artifact = assertObject(artifact_binding, 'ARTIFACT_BINDING_REQUIRED');
  const artifactHash = assertString(artifact.artifact_hash, 'ARTIFACT_HASH_REQUIRED');
  const blockers = [];
  let normalizedChangedPaths = [];

  try {
    normalizedChangedPaths = validateChangedPaths({
      changed_paths,
      write: contract.scope.write,
      forbidden: contract.scope.forbidden,
    });
  } catch (error) {
    blockers.push(`SCOPE:${error.message}`);
  }

  let classification = null;
  let effectiveRisk = normalizeRisk(contract.risk);
  try {
    classification = classifyRisk({
      changed_paths: normalizedChangedPaths.length ? normalizedChangedPaths : changed_paths,
      sensitive_zones: project_map?.sensitive_zones ?? [],
      task_risk_rules: contract.task_risk_rules ?? [],
      manager_risk: contract.risk,
    });
    effectiveRisk = maxRisk(classification.effective_risk, contract.risk_floor);
  } catch (error) {
    blockers.push(`RISK:${error.message}`);
  }

  if (maxRisk(contract.risk, contract.risk_floor) !== normalizeRisk(contract.risk)) {
    blockers.push('CONTRACT_RISK_BELOW_FLOOR');
  }

  const riskPolicy = verificationPolicyForRisk(effectiveRisk);
  if (riskPolicy.human_gate_required && contract.human_gate_required !== true) {
    blockers.push('HUMAN_GATE_REQUIRED_BY_RISK');
  }

  const evidence = gate_evidence?.current ?? {};
  if (riskPolicy.reviewer_required && !gatePass(evidence.REVIEW, 'PASS')) blockers.push('REVIEW_PASS_MISSING');
  if (effectiveRisk === 'HIGH' && !gatePass(evidence.SECURITY, 'PASS')) blockers.push('SECURITY_PASS_MISSING');

  const humanRequired = contract.human_gate_required === true || riskPolicy.human_gate_required;
  if (humanRequired) {
    if (!gatePass(evidence.HUMAN, 'APPROVED')) blockers.push('HUMAN_APPROVAL_MISSING');
    const authorizedLogin = contract.authorized_human_approver?.github_login;
    if (gatePass(evidence.HUMAN, 'APPROVED') && authorizedLogin && evidence.HUMAN.author_login !== authorizedLogin) {
      blockers.push('HUMAN_APPROVER_UNAUTHORIZED');
    }
  }

  blockers.push(...validateLockEvidence(evidence.LOCK, contract, artifactHash));

  if (!protection || protection.passed !== true) blockers.push('PROTECTION_NOT_VERIFIED');

  if (require_required_ci) {
    const checks = protection?.required_checks?.length ? protection.required_checks : REQUIRED_BASE_CHECKS;
    for (const check of checks) {
      if (normalizeStatus(required_ci[check]) !== 'PASS') blockers.push(`REQUIRED_CI_NOT_PASS:${check}`);
    }
  }

  const uniqueBlockers = uniqueSorted(blockers);
  return deepFreeze({
    task_id: contract.task_id,
    artifact_hash: artifactHash,
    effective_risk: effectiveRisk,
    risk: classification,
    changed_paths: normalizedChangedPaths,
    human_gate_required: humanRequired,
    required_ci_checked: require_required_ci,
    protection_passed: protection?.passed === true,
    blockers: uniqueBlockers,
    merge_eligible: uniqueBlockers.length === 0,
  });
}

export function validateProtectionSnapshot(snapshot, { branch = 'main', required_checks = REQUIRED_BASE_CHECKS } = {}) {
  assertObject(snapshot, 'PROTECTION_SNAPSHOT_REQUIRED');
  const blockers = [];
  if (snapshot.branch_protected !== true) blockers.push('MAIN_NOT_PROTECTED');

  const branchRef = `refs/heads/${branch}`;
  const candidates = assertArray(snapshot.rulesets ?? [], 'RULESETS_REQUIRED').filter((ruleset) => {
    const includes = ruleset?.conditions?.ref_name?.include ?? [];
    const excludes = ruleset?.conditions?.ref_name?.exclude ?? [];
    return ruleset?.target === 'branch'
      && ruleset?.enforcement === 'active'
      && includes.includes(branchRef)
      && !excludes.includes(branchRef);
  });

  if (candidates.length !== 1) blockers.push(`PROTECTION_RULESET_AMBIGUOUS:${candidates.length}`);
  const ruleset = candidates[0] ?? null;
  let observedChecks = [];

  if (ruleset) {
    if ((ruleset.bypass_actors ?? []).length !== 0) blockers.push('PROTECTION_BYPASS_ACTORS_PRESENT');
    if (ruleset.current_user_can_bypass !== 'never') blockers.push('PROTECTION_CURRENT_USER_CAN_BYPASS');
    const rules = new Map((ruleset.rules ?? []).map((rule) => [rule.type, rule]));
    if (!rules.has('deletion')) blockers.push('DELETION_PROTECTION_MISSING');
    if (!rules.has('non_fast_forward')) blockers.push('NON_FAST_FORWARD_PROTECTION_MISSING');
    if (!rules.has('pull_request')) blockers.push('PULL_REQUEST_RULE_MISSING');
    const prRule = rules.get('pull_request');
    if (prRule && prRule.parameters?.required_approving_review_count !== 0) blockers.push('STATIC_APPROVAL_COUNT_MUST_BE_ZERO');

    const statusRule = rules.get('required_status_checks');
    if (!statusRule) blockers.push('REQUIRED_STATUS_CHECK_RULE_MISSING');
    else {
      if (statusRule.parameters?.strict_required_status_checks_policy !== true) blockers.push('STRICT_STATUS_CHECKS_REQUIRED');
      observedChecks = uniqueSorted((statusRule.parameters?.required_status_checks ?? []).map((item) => item.context));
      for (const context of required_checks) {
        if (!observedChecks.includes(context)) blockers.push(`REQUIRED_STATUS_CONTEXT_MISSING:${context}`);
      }
    }
  }

  return deepFreeze({
    passed: blockers.length === 0,
    blockers: uniqueSorted(blockers),
    required_checks: observedChecks,
    ruleset_id: ruleset?.id ?? null,
  });
}

async function githubRequest(url, { token, method = 'GET', body } = {}) {
  const make = async (useToken) => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'eqcofe-merge-policy-controller',
    };
    if (useToken && token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };

  let response = await make(true);
  if ((response.status === 403 || response.status === 404) && token && method === 'GET') response = await make(false);
  if (!response.ok) throw new Error(`GITHUB_API_${method}_${response.status}:${url}`);
  return response.json();
}

export async function fetchProtectionSnapshot({ repository, branch = 'main', token, api_url = 'https://api.github.com' }) {
  const repo = assertString(repository, 'GITHUB_REPOSITORY_REQUIRED');
  const encodedBranch = encodeURIComponent(branch);
  const branchData = await githubRequest(`${api_url}/repos/${repo}/branches/${encodedBranch}`, { token });
  const rulesetList = await githubRequest(`${api_url}/repos/${repo}/rulesets`, { token });
  const rulesets = [];
  for (const item of rulesetList) {
    rulesets.push(await githubRequest(`${api_url}/repos/${repo}/rulesets/${item.id}`, { token }));
  }
  return deepFreeze({ branch_protected: branchData.protected === true, rulesets });
}

export async function validateLiveProtection(options) {
  const snapshot = await fetchProtectionSnapshot(options);
  return validateProtectionSnapshot(snapshot, options);
}

function gitHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function gitBytes(args) {
  return execFileSync('git', args, { encoding: null, maxBuffer: 20 * 1024 * 1024 });
}

export function buildGitArtifactBinding({ base_sha, head_sha = gitHead() }) {
  const base = assertString(base_sha, 'BASE_SHA_REQUIRED');
  const diff = execFileSync('git', ['diff', '--name-status', '-M', `${base}...${head_sha}`], { encoding: 'utf8' }).trim();
  if (!diff) throw new Error('ARTIFACT_CHANGES_REQUIRED');
  const changes = [];

  for (const line of diff.split('\n')) {
    const fields = line.split('\t');
    const status = fields[0];
    if (status === 'A' || status === 'M') {
      const path = fields[1];
      changes.push({ operation: status === 'A' ? 'ADD' : 'MODIFY', path, bytes: readFileSync(path) });
    } else if (status === 'D') {
      const path = fields[1];
      changes.push({ operation: 'DELETE', path, bytes: gitBytes(['show', `${base}:${path}`]) });
    } else if (status?.startsWith('R')) {
      const from_path = fields[1];
      const path = fields[2];
      changes.push({ operation: 'RENAME', from_path, path, bytes: readFileSync(path) });
    } else {
      throw new Error(`UNSUPPORTED_GIT_CHANGE_STATUS:${status}`);
    }
  }

  return buildArtifactBinding({ changes, commit_sha: head_sha });
}

function loadJson(path, code) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${code}:${error.message}`);
  }
}

function taskContractPathFromBody(body) {
  const text = typeof body === 'string' ? body : '';
  const match = text.match(/Task Contract:\s*`([^`]+)`/i);
  if (!match) throw new Error('PR_TASK_CONTRACT_PATH_MISSING');
  return match[1];
}

async function fetchAllComments({ repository, pr_number, token, api_url }) {
  const comments = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubRequest(`${api_url}/repos/${repository}/issues/${pr_number}/comments?per_page=100&page=${page}`, { token });
    comments.push(...batch);
    if (batch.length < 100) break;
  }
  return comments;
}

async function fetchRequiredCi({ repository, sha, checks, token, api_url }) {
  const payload = await githubRequest(`${api_url}/repos/${repository}/commits/${sha}/check-runs?per_page=100`, { token });
  const statuses = {};
  for (const name of checks) {
    const candidates = (payload.check_runs ?? []).filter((run) => run.name === name).sort((a, b) => b.id - a.id);
    const latest = candidates[0];
    statuses[name] = latest?.status === 'completed' && latest?.conclusion === 'success' ? 'PASS' : 'NOT_EXECUTED';
  }
  return statuses;
}

function loadProjectMap() {
  return loadJson('.eqcofe/project-map.json', 'PROJECT_MAP_REQUIRED');
}

async function commonPrContext({ repository, pr, token, api_url }) {
  const headSha = pr.head.sha;
  if (gitHead() !== headSha) throw new Error(`CHECKOUT_HEAD_MISMATCH:${gitHead()}:${headSha}`);
  const contractPath = taskContractPathFromBody(pr.body);
  const contract = loadJson(contractPath, 'TASK_CONTRACT_INVALID');
  const artifact = buildGitArtifactBinding({ base_sha: pr.base.sha, head_sha: headSha });
  const comments = await fetchAllComments({ repository, pr_number: pr.number, token, api_url });
  const evidence = parseGateEvidence(comments, { task_id: contract.task_id, artifact_hash: artifact.artifact_hash });
  const protection = await validateLiveProtection({ repository, branch: pr.base.ref, token, api_url, required_checks: REQUIRED_BASE_CHECKS });
  const projectMap = loadProjectMap();
  if (projectMap.repository_sha !== headSha) throw new Error(`PROJECT_MAP_HEAD_MISMATCH:${projectMap.repository_sha}:${headSha}`);
  return { contractPath, contract, artifact, evidence, protection, projectMap, headSha };
}

async function runCiPr() {
  const token = process.env.GITHUB_TOKEN;
  const repository = assertString(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY_REQUIRED');
  const api_url = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const eventPath = assertString(process.env.GITHUB_EVENT_PATH, 'GITHUB_EVENT_PATH_REQUIRED');
  const event = loadJson(eventPath, 'GITHUB_EVENT_INVALID');
  const prNumber = event.pull_request?.number ?? event.number;
  if (!prNumber) throw new Error('PULL_REQUEST_EVENT_REQUIRED');
  const pr = await githubRequest(`${api_url}/repos/${repository}/pulls/${prNumber}`, { token });
  const context = await commonPrContext({ repository, pr, token, api_url });
  const result = evaluateMergePolicy({
    task_contract: context.contract,
    changed_paths: context.artifact.manifest.map((entry) => entry.normalized_repository_relative_path),
    artifact_binding: context.artifact,
    project_map: context.projectMap,
    gate_evidence: context.evidence,
    protection: context.protection,
    require_required_ci: false,
  });
  console.log(JSON.stringify({ mode: 'CI_PR', contract_path: context.contractPath, ...result }, null, 2));
  if (!result.merge_eligible) process.exitCode = 1;
}

async function runProtectionLive() {
  const repository = assertString(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY_REQUIRED');
  const token = process.env.GITHUB_TOKEN;
  const api_url = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const result = await validateLiveProtection({ repository, branch: 'main', token, api_url, required_checks: REQUIRED_BASE_CHECKS });
  console.log(JSON.stringify({ mode: 'PROTECTION_LIVE', ...result }, null, 2));
  if (!result.passed) process.exitCode = 1;
}

async function runMergePr(prNumberInput) {
  const prNumber = Number(prNumberInput);
  if (!Number.isInteger(prNumber) || prNumber < 1) throw new Error('INVALID_PR_NUMBER');
  const repository = assertString(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY_REQUIRED');
  const token = assertString(process.env.GITHUB_TOKEN, 'GITHUB_TOKEN_REQUIRED');
  const api_url = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const pr = await githubRequest(`${api_url}/repos/${repository}/pulls/${prNumber}`, { token });
  if (pr.state !== 'open' || pr.draft === true) throw new Error('PR_NOT_OPEN_AND_READY');
  const context = await commonPrContext({ repository, pr, token, api_url });
  const baseBranch = await githubRequest(`${api_url}/repos/${repository}/branches/${encodeURIComponent(pr.base.ref)}`, { token });
  if (baseBranch.commit?.sha !== pr.base.sha) throw new Error('PR_BASE_NOT_CURRENT');
  const requiredCi = await fetchRequiredCi({
    repository,
    sha: context.headSha,
    checks: context.protection.required_checks.length ? context.protection.required_checks : REQUIRED_BASE_CHECKS,
    token,
    api_url,
  });
  const result = evaluateMergePolicy({
    task_contract: context.contract,
    changed_paths: context.artifact.manifest.map((entry) => entry.normalized_repository_relative_path),
    artifact_binding: context.artifact,
    project_map: context.projectMap,
    gate_evidence: context.evidence,
    protection: context.protection,
    required_ci: requiredCi,
    require_required_ci: true,
  });
  console.log(JSON.stringify({ mode: 'MERGE_EXECUTION', contract_path: context.contractPath, required_ci: requiredCi, ...result }, null, 2));
  if (!result.merge_eligible) throw new Error(`MERGE_POLICY_DENIED:${result.blockers.join(',')}`);

  const merged = await githubRequest(`${api_url}/repos/${repository}/pulls/${prNumber}/merge`, {
    token,
    method: 'PUT',
    body: { sha: context.headSha, merge_method: 'merge' },
  });
  if (merged.merged !== true) throw new Error(`GITHUB_MERGE_REJECTED:${merged.message ?? 'unknown'}`);
  console.log(JSON.stringify({ status: 'MERGED', sha: merged.sha, pr_number: prNumber }));
}

async function main() {
  const [mode, value] = process.argv.slice(2);
  if (mode === '--ci-pr') return runCiPr();
  if (mode === '--protection-live') return runProtectionLive();
  if (mode === '--merge-pr') return runMergePr(value);
  throw new Error('USAGE: --ci-pr | --protection-live | --merge-pr <number>');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify({ status: 'FAIL', error: error.message }));
    process.exitCode = 1;
  });
}
