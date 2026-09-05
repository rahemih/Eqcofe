import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateContract } from '../../scripts/validate-step56-admin-foundation.mjs';

const source = JSON.parse(readFileSync('docs/13-product-design/step56-admin-ux-contract.json', 'utf8'));
const copy = () => structuredClone(source);
test('56-A records complete evidence while preserving the blocked verdict', () => {
  assert.deepEqual(validateContract(source), []);
  assert.equal(source.operationEvidence.filter((e: any) => e.authority === 'CONTRACT_ONLY_NO_CONTROLLER').length, 156);
  assert.equal(source.operationEvidence.filter((e: any) => e.permissionStatus === 'UNRESOLVED_NOT_GRANTED').length, 151);
});
test('56-A rejects a fabricated permission for a contract-only operation', () => {
  const c = copy();
  c.operationEvidence.find((e: any) => e.permissionStatus === 'UNRESOLVED_NOT_GRANTED').permissions = ['admin.universal'];
  assert.ok(validateContract(c).some((e: string) => e.includes('Invented/changed permission')));
});
test('56-A rejects omission of a controller-only operation and hidden gap', () => {
  const c = copy();
  c.operationEvidence = c.operationEvidence.filter((e: any) => e.openapi);
  c.blockers.pop();
  assert.ok(validateContract(c).some((e: string) => e.includes('Operation coverage')));
  assert.ok(validateContract(c).some((e: string) => e.includes('silently waived')));
});
test('56-A rejects unsupported runtime claims and permission grants', () => {
  const c = copy();
  const e = c.operationEvidence.find((x: any) => !x.runtime);
  e.authority = 'OPENAPI_AND_CONTROLLER';
  e.permissionStatus = 'SOURCE_EXPLICIT';
  e.designDisposition = 'SOURCE_TRACED';
  assert.ok(validateContract(c).some((e: string) => e.includes('False runtime authority')));
  assert.ok(validateContract(c).some((e: string) => e.includes('quarantined')));
});
test('56-A rejects duplicate surface ownership and missing inherited journey', () => {
  const c = copy();
  c.screenInventory[1].operations.push(c.screenInventory[0].operations[0]);
  c.journeys.pop();
  assert.ok(validateContract(c).some((e: string) => e.includes('one surface owner')));
  assert.ok(validateContract(c).some((e: string) => e.includes('Inherited admin journeys')));
});
test('56-A rejects missing stale/conflict states and Step 54 drift', () => {
  const c = copy();
  c.stateTaxonomy.conflict = [];
  c.responsive.breakpoints.tablet = 768;
  c.foundation.walletAllowed = true;
  assert.ok(validateContract(c).some((e: string) => e.includes('Missing global state stale-data')));
  assert.ok(validateContract(c).some((e: string) => e.includes('Step 54')));
});
test('56-A cannot mark B started or A passed while evidence is unresolved', () => {
  const c = copy();
  c.nextGateStatus = 'IN_PROGRESS';
  c.status = 'CLOSED_FINAL_GATE_PASS';
  c.pageWireframes.push('invented.svg');
  assert.ok(validateContract(c).some((e: string) => e.includes('56-B')));
  const run = spawnSync(process.execPath, ['scripts/validate-step56-admin-foundation.mjs', '--require-ready'], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /FINAL GATE BLOCKED/);
});
test('56-A deterministic foundation outputs match and include zero wireframes', () => {
  const run = spawnSync(process.execPath, ['scripts/generate-step56-admin-foundation.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const manifest = JSON.parse(readFileSync('docs/13-product-design/step56-foundation/A/manifest.json', 'utf8'));
  assert.equal(manifest.pageWireframeCount, 0);
  assert.equal(manifest.generatedArtifacts.length, 3);
  assert.ok(manifest.generatedArtifacts.every((a: any) => !/\.(svg|png|html)$/.test(a.path)));
});
