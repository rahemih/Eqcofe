import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const file = 'contracts/http/openapi.yaml';
const doc = parse(readFileSync(file, 'utf8'));
if (doc.openapi !== '3.1.0') throw new Error(`Expected OpenAPI 3.1.0, got ${doc.openapi}`);

const overlayFiles = readdirSync('contracts/http')
  .filter((name) => /^openapi-.+\.yaml$/.test(name))
  .sort();
for (const overlayFile of overlayFiles) {
  const overlay = parse(readFileSync(`contracts/http/${overlayFile}`, 'utf8'));
  if (overlay.openapi !== '3.1.0') throw new Error(`Expected OpenAPI 3.1.0 in ${overlayFile}`);
  for (const [path, item] of Object.entries(overlay.paths ?? {})) {
    if (doc.paths?.[path]) throw new Error(`Duplicate OpenAPI path from ${overlayFile}: ${path}`);
    doc.paths ??= {};
    doc.paths[path] = item;
  }
  for (const tag of overlay.tags ?? []) {
    doc.tags ??= [];
    if (!doc.tags.some((candidate) => candidate?.name === tag?.name)) doc.tags.push(tag);
  }
  for (const [section, entries] of Object.entries(overlay.components ?? {})) {
    doc.components ??= {};
    doc.components[section] ??= {};
    for (const [key, value] of Object.entries(entries ?? {})) {
      if (doc.components[section][key] !== undefined) throw new Error(`Duplicate OpenAPI component from ${overlayFile}: ${section}.${key}`);
      doc.components[section][key] = value;
    }
  }
}

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
console.log(JSON.stringify({ openapi: doc.openapi, paths: Object.keys(doc.paths ?? {}).length, operations, refs: refs.length, overlays: overlayFiles, status: 'PASS' }, null, 2));

function walk(value, visit) {
  visit(value);
  if (Array.isArray(value)) value.forEach((v) => walk(v, visit));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walk(v, visit));
}
