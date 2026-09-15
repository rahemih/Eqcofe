import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTokenBudget } from './token-telemetry.mjs';

const RISK = new Set(['LOW', 'MEDIUM', 'HIGH']);
const DEFAULT_TASK_DIR = 'docs/14-multi-agent/tasks';
const DEFAULT_OUTPUT = 'docs/14-multi-agent/generated/TASK-CATALOG.md';

function fail(code) { throw new Error(code); }
function text(value, code) { if (typeof value !== 'string' || value.trim() === '') fail(code); return value.trim(); }
function markdown(value) { return String(value).replaceAll('|', '\\|').replaceAll('\n', ' '); }

export function catalogEntryFromTask(task, filename = '<memory>') {
  if (!task || typeof task !== 'object' || Array.isArray(task)) fail(`INVALID_TASK_CONTRACT:${filename}`);
  const task_id = text(task.task_id, `TASK_ID_REQUIRED:${filename}`);
  const title = text(task.title, `TASK_TITLE_REQUIRED:${filename}`);
  const risk = text(task.risk, `TASK_RISK_REQUIRED:${filename}`).toUpperCase();
  if (!RISK.has(risk)) fail(`INVALID_TASK_RISK:${filename}`);
  if (typeof task.human_gate_required !== 'boolean') fail(`HUMAN_GATE_REQUIRED:${filename}`);
  const base_sha = text(task.canonical?.base_sha, `CANONICAL_BASE_REQUIRED:${filename}`);
  if (!/^[0-9a-f]{40}$/.test(base_sha)) fail(`INVALID_CANONICAL_BASE:${filename}`);
  let token_budget = null;
  if (task.token_budget !== undefined) token_budget = validateTokenBudget(task.token_budget);
  return Object.freeze({ filename, task_id, title, risk, human_gate_required: task.human_gate_required, base_sha, token_budget });
}

export async function loadTaskCatalogEntries(rootDir, taskDir = DEFAULT_TASK_DIR) {
  const absolute = path.join(rootDir, ...taskDir.split('/'));
  const names = (await readdir(absolute)).filter((name) => name.endsWith('.json')).sort();
  const seen = new Set();
  const entries = [];
  for (const name of names) {
    const parsed = JSON.parse(await readFile(path.join(absolute, name), 'utf8'));
    const entry = catalogEntryFromTask(parsed, name);
    if (seen.has(entry.task_id)) fail(`DUPLICATE_TASK_ID:${entry.task_id}`);
    seen.add(entry.task_id);
    entries.push(entry);
  }
  return entries.sort((a, b) => a.task_id.localeCompare(b.task_id));
}

function budgetCell(budget) {
  return budget ? `${budget.expected_max}/${budget.soft_alert}/${budget.hard_cap}` : 'N/A (legacy/no budget)';
}

export function renderTaskCatalog(entries) {
  const lines = [
    '# EQCOFE Multi-Agent Task Catalog',
    '',
    '> AUTO-GENERATED. Source of truth: `docs/14-multi-agent/tasks/*.json`.',
    '> Regenerate only with `scripts/multi-agent/docs-automation.mjs`; do not hand-edit this file.',
    '',
    '| Task ID | Title | Risk | Human Gate | Canonical Base | Token Budget (expected/soft/hard) |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const entry of [...entries].sort((a, b) => a.task_id.localeCompare(b.task_id))) {
    lines.push(`| ${markdown(entry.task_id)} | ${markdown(entry.title)} | ${entry.risk} | ${entry.human_gate_required ? 'REQUIRED' : 'NOT_REQUIRED'} | \`${entry.base_sha}\` | ${budgetCell(entry.token_budget)} |`);
  }
  lines.push('', `Task contracts indexed: **${entries.length}**.`, '');
  return lines.join('\n');
}

export async function expectedTaskCatalog(rootDir) {
  return renderTaskCatalog(await loadTaskCatalogEntries(rootDir));
}

export async function writeTaskCatalog(rootDir, output = DEFAULT_OUTPUT) {
  const expected = await expectedTaskCatalog(rootDir);
  const target = path.join(rootDir, ...output.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, expected, 'utf8');
  return expected;
}

export async function checkTaskCatalog(rootDir, output = DEFAULT_OUTPUT) {
  const expected = await expectedTaskCatalog(rootDir);
  const target = path.join(rootDir, ...output.split('/'));
  let actual;
  try { actual = await readFile(target, 'utf8'); } catch (error) {
    if (error?.code === 'ENOENT') fail(`TASK_CATALOG_MISSING:${output}`);
    throw error;
  }
  if (actual !== expected) fail(`TASK_CATALOG_STALE:${output}`);
  return true;
}

async function cli(args) {
  const rootIndex = args.indexOf('--root');
  const root = rootIndex >= 0 ? path.resolve(args[rootIndex + 1]) : process.cwd();
  if (args.includes('--check')) await checkTaskCatalog(root);
  else await writeTaskCatalog(root);
  console.log(args.includes('--check') ? 'Task catalog PASS' : 'Task catalog generated');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cli(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
