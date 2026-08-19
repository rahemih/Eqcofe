import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const file = 'contracts/http/openapi.yaml';
const doc = parse(readFileSync(file, 'utf8'));
if (doc.openapi !== '3.1.0') throw new Error(`Expected OpenAPI 3.1.0, got ${doc.openapi}`);
const operationIds = new Set();
const duplicates = [];
let operations = 0;
for (const [path, item] of Object.entries(doc.paths ?? {})) {
  for (const [method, operation] of Object.entries(item ?? {})) {
    if (!['get','post','put','patch','delete','options','head','trace'].includes(method)) continue;
    operations++;
    if (!operation.operationId) throw new Error(`Missing operationId: ${method.toUpperCase()} ${path}`);
    if (operationIds.has(operation.operationId)) duplicates.push(operation.operationId);
    operationIds.add(operation.operationId);
  }
}
if (duplicates.length) throw new Error(`Duplicate operationIds: ${duplicates.join(', ')}`);
const refs = [];
walk(doc, (value) => { if (value && typeof value === 'object' && '$ref' in value && typeof value.$ref === 'string') refs.push(value.$ref); });
for (const ref of refs.filter((x) => x.startsWith('#/'))) {
  const parts = ref.slice(2).split('/').map((x) => x.replaceAll('~1','/').replaceAll('~0','~'));
  let current = doc;
  for (const part of parts) {
    current = current?.[part];
    if (current === undefined) throw new Error(`Broken ref: ${ref}`);
  }
}
console.log(JSON.stringify({ openapi: doc.openapi, paths: Object.keys(doc.paths ?? {}).length, operations, refs: refs.length, status: 'PASS' }, null, 2));

function walk(value, visit) {
  visit(value);
  if (Array.isArray(value)) value.forEach((v) => walk(v, visit));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walk(v, visit));
}
