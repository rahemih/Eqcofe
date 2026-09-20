import { readFileSync } from 'node:fs';

export const V1_ACCEPTANCE_MISSION_VERSION = 'V1.5';
export const V1_ACCEPTANCE_MISSION_HASH = '7b29943c936592b63ae76a67359a0cae1b3dd99b2323f1811bc7b2e3d03317a1';
export const V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID = 15368;
export const V1_ACCEPTANCE_REQUIRED_CHECKS = Object.freeze(['merge-policy', 'phase-a', 'verify']);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCheck(entry) {
  const value = asObject(entry);
  return {
    context: typeof value.context === 'string' ? value.context.trim() : '',
    integration_id: Number(value.integration_id),
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function validatePhase0Snapshot(snapshot) {
  const root = asObject(snapshot);
  const mission = asObject(root.mission);
  const protection = asObject(root.protection);
  const acceptance = asObject(root.acceptance);
  const blockers = [];

  if (mission.version !== V1_ACCEPTANCE_MISSION_VERSION) blockers.push('MISSION_VERSION_MISMATCH');
  if (mission.hash !== V1_ACCEPTANCE_MISSION_HASH) blockers.push('MISSION_HASH_MISMATCH');

  const mainHead = typeof root.main_head === 'string' ? root.main_head.trim() : '';
  if (!/^[0-9a-f]{40}$/.test(mainHead)) blockers.push('MAIN_HEAD_INVALID');

  if (protection.branch_protected !== true) blockers.push('BRANCH_PROTECTION_INACTIVE');
  if (protection.ruleset_enforcement !== 'active') blockers.push('RULESET_NOT_ACTIVE');
  if (protection.strict_required_status_checks_policy !== true) blockers.push('STRICT_REQUIRED_CHECKS_DISABLED');

  const bypassActors = asArray(protection.bypass_actors);
  if (!Array.isArray(protection.bypass_actors)) blockers.push('BYPASS_ACTORS_NOT_VERIFIED');
  else if (bypassActors.length !== 0) blockers.push('BYPASS_ACTORS_PRESENT');

  const requiredChecksRaw = asArray(protection.required_checks);
  if (!Array.isArray(protection.required_checks)) {
    blockers.push('REQUIRED_CHECKS_NOT_VERIFIED');
  } else {
    const checks = requiredChecksRaw.map(normalizeCheck);
    const names = checks.map((entry) => entry.context).filter(Boolean);
    const duplicateNames = uniqueSorted(names.filter((name, index) => names.indexOf(name) !== index));
    for (const name of duplicateNames) blockers.push(`REQUIRED_CHECK_DUPLICATE:${name}`);

    const sortedNames = uniqueSorted(names);
    if (
      sortedNames.length !== V1_ACCEPTANCE_REQUIRED_CHECKS.length
      || sortedNames.some((name, index) => name !== V1_ACCEPTANCE_REQUIRED_CHECKS[index])
    ) {
      blockers.push('REQUIRED_CHECK_SET_MISMATCH');
    }

    for (const expected of V1_ACCEPTANCE_REQUIRED_CHECKS) {
      const candidates = checks.filter((entry) => entry.context === expected);
      if (candidates.length !== 1) continue;
      if (candidates[0].integration_id !== V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID) {
        blockers.push(`REQUIRED_CHECK_INTEGRATION_MISMATCH:${expected}`);
      }
    }
  }

  if (!Array.isArray(acceptance.blocking_acceptance_prs)) blockers.push('BLOCKING_ACCEPTANCE_PRS_NOT_VERIFIED');
  else if (acceptance.blocking_acceptance_prs.length !== 0) blockers.push('BLOCKING_ACCEPTANCE_PRS_PRESENT');

  if (!Array.isArray(acceptance.stale_locks)) blockers.push('STALE_LOCKS_NOT_VERIFIED');
  else if (acceptance.stale_locks.length !== 0) blockers.push('STALE_LOCKS_PRESENT');

  if (acceptance.item10_canonical_ancestor !== true) blockers.push('ITEM10_CANONICAL_ANCESTOR_FALSE');

  const normalizedBlockers = uniqueSorted(blockers);
  return deepFreeze({
    status: normalizedBlockers.length === 0 ? 'PASS' : 'FAIL',
    mission_version: mission.version ?? null,
    mission_hash: mission.hash ?? null,
    main_head: mainHead || null,
    required_checks: V1_ACCEPTANCE_REQUIRED_CHECKS,
    required_integration_id: V1_ACCEPTANCE_REQUIRED_INTEGRATION_ID,
    blocking_acceptance_pr_count: Array.isArray(acceptance.blocking_acceptance_prs)
      ? acceptance.blocking_acceptance_prs.length
      : null,
    stale_lock_count: Array.isArray(acceptance.stale_locks)
      ? acceptance.stale_locks.length
      : null,
    item10_canonical_ancestor: acceptance.item10_canonical_ancestor === true,
    blockers: normalizedBlockers,
  });
}

function parseCli(argv) {
  if (argv.length !== 2 || argv[0] !== '--snapshot') {
    throw new Error('USAGE: node scripts/multi-agent/v1-acceptance-phase0.mjs --snapshot <file.json>');
  }
  return argv[1];
}

function runCli() {
  const path = parseCli(process.argv.slice(2));
  const snapshot = JSON.parse(readFileSync(path, 'utf8'));
  const result = validatePhase0Snapshot(snapshot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll('\\\\', '/')}`).href) {
  runCli();
}
