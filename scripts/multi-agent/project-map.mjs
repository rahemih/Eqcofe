import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.eqcofe', 'project-map.json');
const SKIP = new Set(['.git', 'node_modules', 'dist', '.eqcofe']);
const SENSITIVE = [
  ['src/modules/payment', 'HIGH', 'payment_processing'],
  ['src/modules/auth', 'HIGH', 'authentication_authorization'],
  ['src/modules/pricing', 'HIGH', 'pricing'],
  ['src/modules/inventory', 'HIGH', 'inventory_reservation'],
  ['database/migrations', 'HIGH', 'database_migration'],
];

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (entry.isDirectory()) await walk(abs, out);
    else out.push(rel);
  }
  return out;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function gitHead() {
  const head = await readFile(path.join(ROOT, '.git', 'HEAD'), 'utf8').catch(() => '');
  if (!head.trim()) return process.env.GITHUB_SHA ?? 'UNKNOWN';
  if (!head.startsWith('ref: ')) return head.trim();
  const ref = head.slice(5).trim();
  return (await readFile(path.join(ROOT, '.git', ref), 'utf8').catch(() => process.env.GITHUB_SHA ?? 'UNKNOWN')).trim();
}

function moduleName(file) {
  const m = file.match(/^src\/modules\/([^/]+)/);
  return m?.[1] ?? null;
}

const files = await walk(ROOT);
const modules = [...new Set(files.map(moduleName).filter(Boolean))].sort();
const tests = files.filter((f) => /(^|\/)(test|tests)\//.test(f) || /\.(spec|test)\.[cm]?[jt]s$/.test(f));
const migrations = files.filter((f) => f.startsWith('database/migrations/'));
const sensitive_zones = SENSITIVE.filter(([prefix]) => files.some((f) => f.startsWith(prefix))).map(([prefix, minimum_risk, reason]) => ({ path: `${prefix}/**`, minimum_risk, reason }));
const canonical_docs = files.filter((f) => f.startsWith('docs/12-current-state/') || f.startsWith('docs/14-multi-agent/'));
const manifest = [];
for (const file of files) {
  const s = await stat(path.join(ROOT, file));
  if (s.size > 2_000_000) continue;
  const bytes = await readFile(path.join(ROOT, file));
  manifest.push({ path: file, sha256: sha256(bytes) });
}
const repository_sha = await gitHead();
const map = {
  schema_version: '1.0',
  repository_sha,
  generated_at: new Date().toISOString(),
  modules,
  paths: files,
  dependencies: [],
  api_ownership: [],
  database_ownership: migrations,
  tests,
  sensitive_zones,
  canonical_docs,
  relationships: [],
  manifest_hash: sha256(JSON.stringify(manifest)),
};
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS', output: path.relative(ROOT, OUT), repository_sha, files: files.length, modules: modules.length }));
