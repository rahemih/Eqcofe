import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const outDir = path.join(root, 'graphify-out');
const graphPath = path.join(outDir, 'graph.json');
const statePath = path.join(outDir, '.eqcofe-graph-state.json');

async function git(args) {
  const { stdout } = await execFileAsync('git', args, { cwd: root, encoding: 'utf8' });
  return stdout.trim();
}

const data = JSON.parse(await readFile(graphPath, 'utf8'));
const nodes = Array.isArray(data?.nodes) ? data.nodes.length
  : Array.isArray(data?.elements?.nodes) ? data.elements.nodes.length
  : 0;
const edges = Array.isArray(data?.links) ? data.links.length
  : Array.isArray(data?.edges) ? data.edges.length
  : Array.isArray(data?.elements?.edges) ? data.elements.edges.length
  : 0;

if (nodes === 0) throw new Error('GRAPH_HAS_NO_NODES');

await mkdir(outDir, { recursive: true });
const state = {
  schema_version: 1,
  git_head: await git(['rev-parse', 'HEAD']),
  branch: await git(['branch', '--show-current']),
  refreshed_at: new Date().toISOString(),
  graph_path: 'graphify-out/graph.json',
  nodes,
  edges,
};
await writeFile(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ status: 'RECORDED', ...state }, null, 2));
