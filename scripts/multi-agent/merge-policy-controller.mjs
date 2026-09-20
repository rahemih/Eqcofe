import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildArtifactBinding } from './artifact-hash-generator.mjs';
import {
  normalizeRepoPath,
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
export const REQUIRED_PROTECTION_CHECKS = Object.freeze(['verify', 'phase-a', 'merge-policy']);
export const DETERMINISTIC_REVIEW_CHECKS = Object.freeze(['verify', 'phase-a']);
export const GITHUB_ACTIONS_INTEGRATION_ID = 15368;
export const TASK_CONTRACT_ROOT = 'docs/14-multi-agent/tasks/';
const COMMENT_GATE_TYPES = new Set(['REVIEW', 'VERIFICATION', 'SECURITY', 'HUMAN', 'LOCK']);
const EXECUTOR_FORBIDDEN_COMMENT_GATES = new Map([
  ['REVIEW', 'UNAUTHORIZED_REVIEW_EVIDENCE'],
  ['VERIFICATION', 'UNAUTHORIZED_VERIFICATION_EVIDENCE'],
]);

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

function normalizeLogin(value) {
  return assertString(value, 'GITHUB_LOGIN_REQUIRED').toLowerCase();
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
  assertObject(contract.canonical, 'TASK_CANONICAL_REQUIRED');
  assertString(contract.canonical.repository, 'TASK_CANONICAL_REPOSITORY_REQUIRED');
  assertString(contract.canonical.branch, 'TASK_CANONICAL_BRANCH_REQUIRED');
  assertString(contract.canonical.base_sha, 'TASK_CANONICAL_BASE_SHA_REQUIRED');
  if (contract.human_gate_required) {
    assertObject(contract.authorized_human_approver, 'TASK_HUMAN_APPROVER_REQUIRED');
    assertString(contract.authorized_human_approver.github_login, 'TASK_HUMAN_APPROVER_LOGIN_REQUIRED');
  }
  return contract;
}

export function formatGateEvidence(payload) {
  const normalized = assertObject(payload, 'GATE_EVIDENCE_REQUIRED');
  return `<!-- ${GATE_PROTOCOL} ${JSON.stringify(normalized)} -->`;
}

export function parseGateEvidence(comments, { task_id, artifact_hash, trusted_author_login = null }) {
  const taskId = assertString(task_id, 'TASK_ID_REQUIRED');
  const artifactHash = assertString(artifact_hash, 'ARTIFACT_HASH_REQUIRED');
  const trustedAuthor = trusted_author_login === null ? null : normalizeLogin(trusted_author_login);
  const current = {};
  const stale = [];
  const malformed = [];
  const unauthorized = [];
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
      if (!COMMENT_GATE_TYPES.has(gate) || payload.task_id !== taskId) continue;
      const record = {
        ...payload,
        gate,
        author_login: comment?.user?.login ?? null,
        author_type: comment?.user?.type ?? null,
        comment_id: comment?.id ?? null,
        created_at: comment?.created_at ?? null,
      };
      if (EXECUTOR_FORBIDDEN_COMMENT_GATES.has(gate)) {
        unauthorized.push({ ...record, reason: EXECUTOR_FORBIDDEN_COMMENT_GATES.get(gate) });
        continue;
      }
      if (trustedAuthor !== null) {
        const author = typeof record.author_login === 'string' ? record.author_login.toLowerCase() : '';
        if (author !== trustedAuthor) {
          unauthorized.push({ ...record, reason: 'UNTRUSTED_GATE_AUTHOR' });
          continue;
        }
      }
      if (payload.artifact_hash !== artifactHash) {
        stale.push(record);
        continue;
      }
      const previous = current[gate];
      if (!previous || Number(record.comment_id ?? 0) >= Number(previous.comment_id ?? 0)) current[gate] = record;
    }
  }

  return deepFreeze({ current, stale, malformed, unauthorized });
}

function normalizeProviderCheckResult(run) {
  if (!run || run.status !== 'completed') return 'NOT_EXECUTED';
  const conclusion = normalizeStatus(run.conclusion);
  if (conclusion === 'SUCCESS') return 'PASS';
  if (['FAILURE', 'TIMED_OUT', 'STARTUP_FAILURE'].includes(conclusion)) return 'FAIL';
  if (conclusion === 'CANCELLED') return 'NOT_EXECUTED';
  if (conclusion === 'ACTION_REQUIRED') return 'BLOCKED';
  if (['SKIPPED', 'NEUTRAL'].includes(conclusion)) return 'N/A';
  return 'BLOCKED';
}

export function buildTrustedProviderCheckEvidence({
  check_runs,
  checks = REQUIRED_PROTECTION_CHECKS,
  head_sha,
  required_integration_id = GITHUB_ACTIONS_INTEGRATION_ID,
}) {
  const runs = assertArray(check_runs, 'CHECK_RUNS_REQUIRED');
  const names = uniqueSorted(assertArray(checks, 'CHECK_NAMES_REQUIRED').map((name) => assertString(name, 'CHECK_NAME_REQUIRED')));
  const headSha = assertString(head_sha, 'CHECK_HEAD_SHA_REQUIRED');
  const integrationId = Number(required_integration_id);
  if (!Number.isInteger(integrationId) || integrationId < 1) throw new Error('CHECK_INTEGRATION_ID_INVALID');

  const statuses = {};
  const facts = {};
  for (const name of names) {
    const candidates = runs
      .filter((run) => (
        run?.name === name
        && Number(run?.app?.id) === integrationId
        && run?.head_sha === headSha
      ))
      .sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0));
    const latest = candidates[0] ?? null;
    statuses[name] = normalizeProviderCheckResult(latest);
    facts[name] = latest ? {
      check_run_id: latest.id ?? null,
      name,
      raw_status: latest.status ?? null,
      raw_conclusion: latest.conclusion ?? null,
      normalized_result: statuses[name],
      integration_id: Number(latest.app?.id),
      head_sha: latest.head_sha,
    } : null;
  }
  return deepFreeze({
    source: 'GITHUB_CHECK_RUN_PROVIDER_FACTS',
    head_sha: headSha,
    integration_id: integrationId,
    statuses,
    facts,
  });
}

export function buildDeterministicReviewEvidence({ provider_checks, artifact_hash, head_sha }) {
  const provider = assertObject(provider_checks, 'PROVIDER_CHECK_EVIDENCE_REQUIRED');
  const artifactHash = assertString(artifact_hash, 'ARTIFACT_HASH_REQUIRED');
  const headSha = assertString(head_sha, 'REVIEW_HEAD_SHA_REQUIRED');
  if (provider.head_sha !== headSha) throw new Error('DETERMINISTIC_REVIEW_HEAD_MISMATCH');
  if (Number(provider.integration_id) !== GITHUB_ACTIONS_INTEGRATION_ID) {
    throw new Error('DETERMINISTIC_REVIEW_INTEGRATION_MISMATCH');
  }

  const statuses = assertObject(provider.statuses, 'PROVIDER_CHECK_STATUSES_REQUIRED');
  const missing = DETERMINISTIC_REVIEW_CHECKS.filter((name) => normalizeStatus(statuses[name]) !== 'PASS');
  return deepFreeze({
    gate: 'REVIEW',
    status: missing.length === 0 ? 'PASS' : 'NOT_EXECUTED',
    authority: 'CI_DETERMINISTIC',
    transport: 'GITHUB_ACTIONS_CHECK_RUNS',
    integration_id: GITHUB_ACTIONS_INTEGRATION_ID,
    required_checks: [...DETERMINISTIC_REVIEW_CHECKS],
    provider_results: Object.fromEntries(DETERMINISTIC_REVIEW_CHECKS.map((name) => [name, statuses[name] ?? 'NOT_EXECUTED'])),
    artifact_hash: artifactHash,
    head_sha: headSha,
    missing_checks: missing,
  });
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
  deterministic_review = null,
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
  const unauthorizedEvidence = Array.isArray(gate_evidence?.unauthorized) ? gate_evidence.unauthorized : [];
  if (unauthorizedEvidence.some((record) => record.reason === 'UNAUTHORIZED_REVIEW_EVIDENCE')) {
    blockers.push('UNAUTHORIZED_REVIEW_EVIDENCE');
  }
  if (unauthorizedEvidence.some((record) => record.reason === 'UNAUTHORIZED_VERIFICATION_EVIDENCE')) {
    blockers.push('UNAUTHORIZED_VERIFICATION_EVIDENCE');
  }

  if (riskPolicy.reviewer_required) {
    if (!deterministic_review || normalizeStatus(deterministic_review.status) !== 'PASS') {
      blockers.push('REVIEW_PASS_MISSING');
    } else {
      if (deterministic_review.authority !== 'CI_DETERMINISTIC') blockers.push('REVIEW_AUTHORITY_INVALID');
      if (deterministic_review.transport !== 'GITHUB_ACTIONS_CHECK_RUNS') blockers.push('REVIEW_TRANSPORT_INVALID');
      if (Number(deterministic_review.integration_id) !== GITHUB_ACTIONS_INTEGRATION_ID) blockers.push('REVIEW_INTEGRATION_INVALID');
      if (deterministic_review.artifact_hash !== artifactHash) blockers.push('REVIEW_ARTIFACT_MISMATCH');
      if (artifact.commit_sha && deterministic_review.head_sha !== artifact.commit_sha) blockers.push('REVIEW_HEAD_MISMATCH');
      const reviewChecks = uniqueSorted(assertArray(deterministic_review.required_checks, 'REVIEW_REQUIRED_CHECKS_REQUIRED'));
      if (JSON.stringify(reviewChecks) !== JSON.stringify([...DETERMINISTIC_REVIEW_CHECKS].sort())) blockers.push('REVIEW_CHECK_SET_INVALID');
    }
  }
  if (effectiveRisk === 'HIGH' && !gatePass(evidence.SECURITY, 'PASS')) blockers.push('SECURITY_PASS_MISSING');

  const humanRequired = contract.human_gate_required === true || riskPolicy.human_gate_required;
  if (humanRequired) {
    if (!gatePass(evidence.HUMAN, 'APPROVED')) blockers.push('HUMAN_APPROVAL_MISSING');
    const authorizedLogin = contract.authorized_human_approver?.github_login;
    if (gatePass(evidence.HUMAN, 'APPROVED') && authorizedLogin
      && normalizeLogin(evidence.HUMAN.author_login) !== normalizeLogin(authorizedLogin)) {
      blockers.push('HUMAN_APPROVER_UNAUTHORIZED');
    }
  }

  blockers.push(...validateLockEvidence(evidence.LOCK, contract, artifactHash));

  if (!protection || protection.passed !== true) blockers.push('PROTECTION_NOT_VERIFIED');

  if (require_required_ci) {
    const checks = protection?.required_checks?.length ? protection.required_checks : REQUIRED_PROTECTION_CHECKS;
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
    deterministic_review: deterministic_review ?? null,
    required_ci_checked: require_required_ci,
    protection_passed: protection?.passed === true,
    blockers: uniqueBlockers,
    merge_eligible: uniqueBlockers.length === 0,
  });
}

export function validateProtectionSnapshot(snapshot, {
  branch = 'main',
  required_checks = REQUIRED_PROTECTION_CHECKS,
  required_integration_id = GITHUB_ACTIONS_INTEGRATION_ID,
} = {}) {
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
      const items = statusRule.parameters?.required_status_checks ?? [];
      observedChecks = uniqueSorted(items.map((item) => item.context));
      for (const context of required_checks) {
        const matches = items.filter((item) => item.context === context);
        if (matches.length === 0) {
          blockers.push(`REQUIRED_STATUS_CONTEXT_MISSING:${context}`);
          continue;
        }
        if (!matches.some((item) => Number(item.integration_id) === Number(required_integration_id))) {
          blockers.push(`REQUIRED_STATUS_CONTEXT_WRONG_INTEGRATION:${context}`);
        }
      }
    }
  }

  return deepFreeze({
    passed: blockers.length === 0,
    blockers: uniqueSorted(blockers),
    required_checks: observedChecks,
    required_integration_id,
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

export function artifactScopePaths(artifact) {
  const manifest = assertArray(artifact?.manifest, 'ARTIFACT_MANIFEST_REQUIRED');
  return uniqueSorted(manifest.flatMap((entry) => [
    entry.normalized_repository_relative_path,
    ...(entry.operation === 'RENAME' && entry.from_path ? [entry.from_path] : []),
  ]));
}

function loadJson(path, code) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${code}:${error.message}`);
  }
}

export function taskContractPathFromBody(body) {
  const text = typeof body === 'string' ? body : '';
  const match = text.match(/Task Contract:\s*`([^`]+)`/i);
  if (!match) throw new Error('PR_TASK_CONTRACT_PATH_MISSING');
  const normalized = normalizeRepoPath(match[1]);
  if (!normalized.startsWith(TASK_CONTRACT_ROOT) || !normalized.endsWith('.json')) {
    throw new Error('PR_TASK_CONTRACT_PATH_FORBIDDEN');
  }
  const relative = normalized.slice(TASK_CONTRACT_ROOT.length);
  if (!relative || relative.includes('/') || !/^[A-Za-z0-9._-]+\.json$/.test(relative)) {
    throw new Error('PR_TASK_CONTRACT_PATH_FORBIDDEN');
  }
  return normalized;
}

export function validatePrTrustBoundary(pr, repository) {
  const expected = assertString(repository, 'GITHUB_REPOSITORY_REQUIRED').toLowerCase();
  const headRepo = assertString(pr?.head?.repo?.full_name, 'PR_HEAD_REPOSITORY_REQUIRED').toLowerCase();
  const baseRepo = assertString(pr?.base?.repo?.full_name, 'PR_BASE_REPOSITORY_REQUIRED').toLowerCase();
  if (headRepo !== expected) throw new Error(`EXTERNAL_HEAD_REPOSITORY_FORBIDDEN:${headRepo}`);
  if (baseRepo !== expected) throw new Error(`UNEXPECTED_BASE_REPOSITORY:${baseRepo}`);
  return true;
}

export function validateTaskContractAuthority({ contract, contract_path, repository, base_branch, base_sha, trusted_owner_login }) {
  const normalized = normalizeContract(contract);
  const repo = assertString(repository, 'GITHUB_REPOSITORY_REQUIRED');
  const branch = assertString(base_branch, 'BASE_BRANCH_REQUIRED');
  const baseSha = assertString(base_sha, 'BASE_SHA_REQUIRED');
  const ownerLogin = normalizeLogin(trusted_owner_login);
  const contractPath = normalizeRepoPath(contract_path);
  const expectedPath = `${TASK_CONTRACT_ROOT}${normalized.task_id}.json`;

  if (contractPath !== expectedPath) throw new Error(`TASK_CONTRACT_PATH_TASK_ID_MISMATCH:${contractPath}`);
  if (normalized.canonical.repository.toLowerCase() !== repo.toLowerCase()) throw new Error('TASK_CANONICAL_REPOSITORY_MISMATCH');
  if (normalized.canonical.branch !== branch) throw new Error('TASK_CANONICAL_BRANCH_MISMATCH');
  if (normalized.canonical.base_sha !== baseSha) throw new Error('TASK_CANONICAL_BASE_SHA_MISMATCH');
  if (normalized.human_gate_required) {
    if (normalizeStatus(normalized.authorized_human_approver?.role) !== 'PROJECT_OWNER') {
      throw new Error('TASK_HUMAN_APPROVER_ROLE_INVALID');
    }
    if (normalizeLogin(normalized.authorized_human_approver.github_login) !== ownerLogin) {
      throw new Error('TASK_HUMAN_APPROVER_NOT_TRUSTED_OWNER');
    }
  }
  return true;
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

async function fetchProviderChecks({ repository, sha, checks, token, api_url }) {
  const payload = await githubRequest(`${api_url}/repos/${repository}/commits/${sha}/check-runs?per_page=100`, { token });
  return buildTrustedProviderCheckEvidence({
    check_runs: payload.check_runs ?? [],
    checks,
    head_sha: sha,
    required_integration_id: GITHUB_ACTIONS_INTEGRATION_ID,
  });
}

function loadProjectMap() {
  return loadJson('.eqcofe/project-map.json', 'PROJECT_MAP_REQUIRED');
}

async function commonPrContext({ repository, pr, token, api_url }) {
  validatePrTrustBoundary(pr, repository);
  const headSha = pr.head.sha;
  if (gitHead() !== headSha) throw new Error(`CHECKOUT_HEAD_MISMATCH:${gitHead()}:${headSha}`);
  const contractPath = taskContractPathFromBody(pr.body);
  const contract = loadJson(contractPath, 'TASK_CONTRACT_INVALID');
  const trustedOwnerLogin = repository.split('/')[0];
  validateTaskContractAuthority({
    contract,
    contract_path: contractPath,
    repository,
    base_branch: pr.base.ref,
    base_sha: pr.base.sha,
    trusted_owner_login: trustedOwnerLogin,
  });
  const artifact = buildGitArtifactBinding({ base_sha: pr.base.sha, head_sha: headSha });
  const comments = await fetchAllComments({ repository, pr_number: pr.number, token, api_url });
  const evidence = parseGateEvidence(comments, {
    task_id: contract.task_id,
    artifact_hash: artifact.artifact_hash,
    trusted_author_login: trustedOwnerLogin,
  });
  const protection = await validateLiveProtection({
    repository,
    branch: pr.base.ref,
    token,
    api_url,
    required_checks: REQUIRED_PROTECTION_CHECKS,
    required_integration_id: GITHUB_ACTIONS_INTEGRATION_ID,
  });
  const projectMap = loadProjectMap();
  if (projectMap.repository_sha !== headSha) throw new Error(`PROJECT_MAP_HEAD_MISMATCH:${projectMap.repository_sha}:${headSha}`);
  return { contractPath, contract, artifact, evidence, protection, projectMap, headSha, trustedOwnerLogin };
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
  const providerChecks = await fetchProviderChecks({
    repository,
    sha: context.headSha,
    checks: DETERMINISTIC_REVIEW_CHECKS,
    token,
    api_url,
  });
  const deterministicReview = buildDeterministicReviewEvidence({
    provider_checks: providerChecks,
    artifact_hash: context.artifact.artifact_hash,
    head_sha: context.headSha,
  });
  const result = evaluateMergePolicy({
    task_contract: context.contract,
    changed_paths: artifactScopePaths(context.artifact),
    artifact_binding: context.artifact,
    project_map: context.projectMap,
    gate_evidence: context.evidence,
    deterministic_review: deterministicReview,
    protection: context.protection,
    require_required_ci: false,
  });
  console.log(JSON.stringify({
    mode: 'CI_PR',
    contract_path: context.contractPath,
    trusted_gate_author: context.trustedOwnerLogin,
    protection: context.protection,
    deterministic_review: deterministicReview,
    stale_evidence: context.evidence.stale.length,
    unauthorized_evidence: context.evidence.unauthorized.length,
    ...result,
  }, null, 2));
  if (!result.merge_eligible) process.exitCode = 1;
}

async function runProtectionLive() {
  const repository = assertString(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY_REQUIRED');
  const token = process.env.GITHUB_TOKEN;
  const api_url = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const result = await validateLiveProtection({
    repository,
    branch: 'main',
    token,
    api_url,
    required_checks: REQUIRED_PROTECTION_CHECKS,
    required_integration_id: GITHUB_ACTIONS_INTEGRATION_ID,
  });
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
  const providerChecks = await fetchProviderChecks({
    repository,
    sha: context.headSha,
    checks: context.protection.required_checks.length ? context.protection.required_checks : REQUIRED_PROTECTION_CHECKS,
    token,
    api_url,
  });
  const requiredCi = providerChecks.statuses;
  const deterministicReview = buildDeterministicReviewEvidence({
    provider_checks: providerChecks,
    artifact_hash: context.artifact.artifact_hash,
    head_sha: context.headSha,
  });
  const result = evaluateMergePolicy({
    task_contract: context.contract,
    changed_paths: artifactScopePaths(context.artifact),
    artifact_binding: context.artifact,
    project_map: context.projectMap,
    gate_evidence: context.evidence,
    deterministic_review: deterministicReview,
    protection: context.protection,
    required_ci: requiredCi,
    require_required_ci: true,
  });
  console.log(JSON.stringify({
    mode: 'MERGE_EXECUTION',
    contract_path: context.contractPath,
    trusted_gate_author: context.trustedOwnerLogin,
    unauthorized_evidence: context.evidence.unauthorized.length,
    deterministic_review: deterministicReview,
    required_ci: requiredCi,
    ...result,
  }, null, 2));
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
