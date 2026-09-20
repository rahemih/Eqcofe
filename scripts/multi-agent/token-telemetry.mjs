import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const SOURCE_TYPES = new Set(['PROVIDER_API', 'MODEL_CLIENT', 'MANUAL_REPORTED']);
const TERMINAL_STATES = new Set(['MERGED', 'ABORTED']);
const COUNT_FIELDS = [
  'input_tokens', 'context_tokens_read', 'output_tokens', 'files_read', 'files_written',
  'model_calls', 'retry_count', 'verification_calls',
];

function fail(code) { throw new Error(code); }
function nonEmpty(value, code) { if (typeof value !== 'string' || value.trim() === '') fail(code); return value.trim(); }
function nonNegativeInteger(value, code) { if (!Number.isSafeInteger(value) || value < 0) fail(code); return value; }
function validateTimestamp(value) {
  const text = nonEmpty(value, 'TELEMETRY_TIMESTAMP_REQUIRED');
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== text) fail('INVALID_TELEMETRY_TIMESTAMP');
  return text;
}

export function normalizeTaskId(value) {
  const taskId = nonEmpty(value, 'TASK_ID_REQUIRED');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(taskId)) fail('INVALID_TASK_ID');
  return taskId;
}

export function validateTokenBudget(budget) {
  if (!budget || typeof budget !== 'object' || Array.isArray(budget)) fail('TOKEN_BUDGET_REQUIRED');
  const expected_max = nonNegativeInteger(budget.expected_max, 'INVALID_EXPECTED_MAX');
  const soft_alert = nonNegativeInteger(budget.soft_alert, 'INVALID_SOFT_ALERT');
  const hard_cap = nonNegativeInteger(budget.hard_cap, 'INVALID_HARD_CAP');
  if (expected_max <= 0 || !(expected_max < soft_alert && soft_alert < hard_cap)) fail('INVALID_TOKEN_BUDGET_ORDER');
  return Object.freeze({ expected_max, soft_alert, hard_cap });
}

export function telemetryPath(taskId) {
  return `.eqcofe/telemetry/${normalizeTaskId(taskId)}.json`;
}

export function normalizeUsageEvent(event, expectedTaskId) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) fail('INVALID_TELEMETRY_EVENT');
  const task_id = normalizeTaskId(event.task_id);
  if (expectedTaskId && task_id !== normalizeTaskId(expectedTaskId)) fail('TELEMETRY_TASK_MISMATCH');
  const agent_id = nonEmpty(event.agent_id, 'AGENT_ID_REQUIRED');
  const source = nonEmpty(event.source, 'TELEMETRY_SOURCE_REQUIRED').toUpperCase();
  if (!SOURCE_TYPES.has(source)) fail('INVALID_TELEMETRY_SOURCE');
  const timestamp = validateTimestamp(event.timestamp);
  const normalized = { task_id, agent_id, source, timestamp };
  for (const field of COUNT_FIELDS) normalized[field] = nonNegativeInteger(event[field] ?? 0, `INVALID_${field.toUpperCase()}`);
  if (normalized.context_tokens_read > normalized.input_tokens) fail('CONTEXT_TOKENS_EXCEED_INPUT');
  if (event.total_tokens !== undefined) {
    const total = nonNegativeInteger(event.total_tokens, 'INVALID_TOTAL_TOKENS');
    if (total !== normalized.input_tokens + normalized.output_tokens) fail('INCONSISTENT_TOTAL_TOKENS');
  }
  if (event.terminal_state !== undefined && event.terminal_state !== null) {
    const terminal_state = nonEmpty(event.terminal_state, 'INVALID_TERMINAL_STATE').toUpperCase();
    if (!TERMINAL_STATES.has(terminal_state)) fail('INVALID_TERMINAL_STATE');
    normalized.terminal_state = terminal_state;
  }
  if (event.human_rejected !== undefined && typeof event.human_rejected !== 'boolean') fail('INVALID_HUMAN_REJECTED');
  normalized.human_rejected = event.human_rejected === true;
  if (event.source_ref !== undefined) normalized.source_ref = nonEmpty(event.source_ref, 'INVALID_SOURCE_REF');
  return Object.freeze(normalized);
}

function compareEvents(a, b) {
  return a.timestamp.localeCompare(b.timestamp)
    || a.agent_id.localeCompare(b.agent_id)
    || a.source.localeCompare(b.source)
    || (a.source_ref ?? '').localeCompare(b.source_ref ?? '')
    || JSON.stringify(a).localeCompare(JSON.stringify(b));
}

export function evaluateBudget(totalModelTokens, budget) {
  const total = nonNegativeInteger(totalModelTokens, 'INVALID_TOTAL_MODEL_TOKENS');
  const normalized = validateTokenBudget(budget);
  if (total >= normalized.hard_cap) return 'HARD_CAP_EXCEEDED';
  if (total >= normalized.soft_alert) return 'SOFT_ALERT';
  if (total > normalized.expected_max) return 'EXPECTED_EXCEEDED';
  return 'NORMAL';
}

export function buildTelemetryRecord({ task_id, token_budget, events }) {
  const taskId = normalizeTaskId(task_id);
  const budget = validateTokenBudget(token_budget);
  if (!Array.isArray(events) || events.length === 0) fail('TELEMETRY_EVENTS_REQUIRED');
  const normalizedEvents = events.map((event) => normalizeUsageEvent(event, taskId)).sort(compareEvents);
  const totals = Object.fromEntries(COUNT_FIELDS.map((field) => [field, 0]));
  for (const event of normalizedEvents) for (const field of COUNT_FIELDS) totals[field] += event[field];
  const total_model_tokens = totals.input_tokens + totals.output_tokens;
  const terminalEvents = normalizedEvents.filter((event) => event.terminal_state);
  const terminal_state = terminalEvents.at(-1)?.terminal_state ?? null;
  const human_rejected = normalizedEvents.some((event) => event.human_rejected);
  const agents = [...new Set(normalizedEvents.map((event) => event.agent_id))].sort();
  const sources = [...new Set(normalizedEvents.map((event) => event.source))].sort();
  const record = {
    schema_version: '1.0',
    task_id: taskId,
    storage_path: telemetryPath(taskId),
    token_budget: budget,
    budget_status: evaluateBudget(total_model_tokens, budget),
    measurements: { ...totals, total_model_tokens },
    agents,
    sources,
    event_count: normalizedEvents.length,
    terminal_state,
    human_rejected,
    calibration_primary_sample: terminal_state === 'MERGED' && !human_rejected,
    provenance: {
      explicit_usage_only: true,
      provider_authoritative: normalizedEvents.every((event) => event.source === 'PROVIDER_API'),
      note: 'context_tokens_read is a subset of input_tokens and is not added to total_model_tokens',
    },
    events: normalizedEvents,
  };
  return Object.freeze(record);
}

export function validateTelemetryRecord(record, expectedTaskId) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail('INVALID_TELEMETRY_RECORD');
  const taskId = normalizeTaskId(record.task_id);
  if (expectedTaskId && taskId !== normalizeTaskId(expectedTaskId)) fail('TELEMETRY_TASK_MISMATCH');
  const rebuilt = buildTelemetryRecord({
    task_id: taskId,
    token_budget: record.token_budget,
    events: record.events,
  });
  if (!isDeepStrictEqual(record, rebuilt)) fail('TELEMETRY_RECORD_INTEGRITY_MISMATCH');
  return rebuilt;
}

export async function persistTelemetryRecord(rootDir, record) {
  if (!record || typeof record !== 'object') fail('INVALID_TELEMETRY_RECORD');
  const taskId = normalizeTaskId(record.task_id);
  const validated = validateTelemetryRecord(record, taskId);
  const relative = telemetryPath(taskId);
  const target = path.join(rootDir, ...relative.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp-${process.pid}`;
  await writeFile(temp, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  await rename(temp, target);
  return relative;
}

export async function readTelemetryRecord(rootDir, taskId) {
  const normalizedTaskId = normalizeTaskId(taskId);
  const relative = telemetryPath(normalizedTaskId);
  const target = path.join(rootDir, ...relative.split('/'));
  let parsed;
  try {
    parsed = JSON.parse(await readFile(target, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) fail('INVALID_TELEMETRY_JSON');
    throw error;
  }
  return validateTelemetryRecord(parsed, normalizedTaskId);
}

async function cli(argv) {
  if (argv.length === 0) return;
  if (argv[0] !== '--help') fail('TOKEN_TELEMETRY_LIBRARY_ONLY');
  console.log('Token telemetry is library-driven. Persist only explicit usage events to .eqcofe/telemetry/<task_id>.json.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cli(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
