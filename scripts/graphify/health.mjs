import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const graphPath = path.join(root, 'graphify-out', 'graph.json');
const statePath = path.join(root, 'graphify-out', '.eqcofe-graph-state.json');

async function git(args) {
  const { stdout } = await execFileAsync('git', args, { cwd: root, encoding: 'utf8' });
  return stdout.trim();
}

function graphCounts(data) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes.length
    : Array.isArray(data?.elements?.nodes) ? data.elements.nodes.length
    : 0;
  const edges = Array.isArray(data?.links) ? data.links.length
    : Array.isArray(data?.edges) ? data.edges.length
    : Array.isArray(data?.elements?.edges) ? data.elements.edges.length
    : 0;
  return { nodes, edges };
}

let graph;
try {
  graph = JSON.parse(await readFile(graphPath, 'utf8'));
} catch (error) {
  console.log(JSON.stringify({ status: 'MISSING_OR_INVALID', graph_path: 'graphify-out/graph.json', error: error.code ?? error.message }, null, 2));
  process.exitCode = 2;
  process.exit();
}

const head = await git(['rev-parse', 'HEAD']);
const branch = await git(['branch', '--show-current']);
let state = null;
try {
  state = JSON.parse(await readFile(statePath, 'utf8'));
} catch {}

const counts = graphCounts(graph);
const recordedHead = typeof state?.git_head === 'string' ? state.git_head : null;
const freshness = recordedHead === head ? 'FRESH' : 'STALE';

const result = {
  status: counts.nodes > 0 ? 'PASS' : 'DEGRADED',
  freshness,
  branch,
  git_head: head,
  recorded_graph_head: recordedHead,
  nodes: counts.nodes,
  edges: counts.edges,
  graph_path: 'graphify-out/graph.json',
  state_path: 'graphify-out/.eqcofe-graph-state.json',
  refreshed_at: state?.refreshed_at ?? null,
};

console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS' || freshness !== 'FRESH') process.exitCode = 1;
