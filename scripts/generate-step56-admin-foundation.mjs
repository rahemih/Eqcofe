import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source = 'docs/13-product-design/step56-admin-ux-contract.json';
const c = JSON.parse(readFileSync(source, 'utf8'));
const dir = 'docs/13-product-design/step56-foundation/A';
const hash = (s) => createHash('sha256').update(s).digest('hex');
const json = (v) => '{\n' + Object.entries(v).map(([key, value]) => '  ' + JSON.stringify(key) + ': ' + (Array.isArray(value) && value.length ? '[\n' + value.map((row) => '    ' + JSON.stringify(row)).join(',\n') + '\n  ]' : JSON.stringify(value, null, 2).replaceAll('\n', '\n  '))).join(',\n') + '\n}\n';
const outputs = {};
outputs['admin-traceability.json'] = json({ step: 56, gate: 'A', status: c.status, counts: c.counts, screenInventory: c.screenInventory, tasks: c.tasks, domains: c.domains, operations: c.operationEvidence });
outputs['ADMIN-SCOPE-INVENTORY.md'] = '# Step 56-A — Admin scope candidate\n\n**Final gate: BLOCKED.** This is a foundation inventory, not a page wireframe. A task workspace groups read/detail/action surfaces; 97 obligations are not a claim of 97 implemented pages.\n\n| ID | Gate | Persian task | Journeys | Domains | Operations | Blocked operations |\n|---|---|---|---|---|---:|---:|\n' + c.screenInventory.map((s) => `| ${s.id} | ${s.gate} | ${s.title} | ${s.journeys.join(', ')} | ${s.domains.join(', ')} | ${s.operations.length} | ${s.blockedOperations.length} |`).join('\n') + '\n\n## Later acceptance gates\n\n' + c.acceptanceGates.map((g) => `### ${g.id} — NOT_STARTED\n\n${g.requirements.map((r) => '- ' + r).join('\n')}\n`).join('\n');
outputs['SOURCE-GAPS.md'] = '# Step 56-A — Unresolved canonical source gaps\n\nThese gaps block FINAL GATE PASS and merge. Structural validation verifies that this register is complete; it does not waive a gap or prove runtime implementation. No backend/API/permission repair is authorized by this foundation.\n\n' + c.blockers.map((b) => `## ${b.id} — ${b.operations.length} operations\n\n${b.reason}\n\nResolution: ${b.requiredResolution}\n\n| Operation | Surface | OpenAPI source | Controller source | Permission status |\n|---|---|---|---|---|\n${b.operations.map((key) => { const e = c.operationEvidence.find((o) => o.key === key); return `| \`${key}\` | ${e.screen} | ${e.openapi?.source ?? e.supplemental?.source ?? 'Not in assembled OpenAPI'} | ${e.runtime ? e.runtime.source + ':' + e.runtime.line : 'No matching source controller'} | ${e.permissionStatus} |`; }).join('\n')}\n`).join('\n');
outputs['manifest.json'] = json({ step: 56, substep: 'A', status: c.status, source, sourceSha256: hash(readFileSync(source, 'utf8').replaceAll('\r\n', '\n')), pageWireframeCount: 0, canonicalSource: 'repository', figmaMirror: 'OPTIONAL_NOT_REQUIRED', generatedArtifacts: Object.entries(outputs).map(([name, content]) => ({ path: `${dir}/${name}`, sha256: hash(content), bytes: Buffer.byteLength(content) })) });
if (process.argv.includes('--check')) {
  const errors = Object.entries(outputs).filter(([name, text]) => !existsSync(`${dir}/${name}`) || readFileSync(`${dir}/${name}`, 'utf8').replaceAll('\r\n', '\n') !== text).map(([name]) => name);
  if (existsSync(dir)) errors.push(...readdirSync(dir).filter((name) => !(name in outputs)));
  if (errors.length) throw new Error(`Step 56 foundation artifact drift: ${errors.join(', ')}`);
} else {
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(outputs)) writeFileSync(`${dir}/${name}`, text);
}
console.log(JSON.stringify({ generator: 'step56-admin-foundation', artifacts: Object.keys(outputs).length, pageWireframes: 0, status: 'PASS', finalGate: 'BLOCKED' }));
