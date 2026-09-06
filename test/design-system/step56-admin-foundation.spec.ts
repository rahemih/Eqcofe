import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateContract } from '../../scripts/validate-step56-admin-foundation.mjs';

const source = JSON.parse(readFileSync('docs/13-product-design/step56-admin-ux-contract.json', 'utf8'));
const copy = () => structuredClone(source);
test('56-A records complete evidence while preserving open implementation restrictions', () => {
  assert.deepEqual(validateContract(source), []);
  assert.equal(source.operationEvidence.filter((e: any) => e.authority === 'CONTRACT_ONLY_NO_CONTROLLER').length, 156);
  assert.equal(source.operationEvidence.filter((e: any) => e.permissionStatus === 'UNRESOLVED_NOT_GRANTED').length, 151);
});
test('56-A rejects a fabricated permission for a contract-only operation', () => {
  const c = copy();
  c.operationEvidence.find((e: any) => e.permissionStatus === 'UNRESOLVED_NOT_GRANTED').permissions = ['admin.universal'];
  assert.ok(validateContract(c).some((e: string) => e.includes('Invented/changed permission')));
});
test('56-A cannot hide conflicting controller and OpenAPI permissions', () => {
  const c = copy();
  const e = c.operationEvidence.find((x: any) => x.permissionConflict);
  e.permissionConflict = false;
  e.permissionStatus = 'SOURCE_EXPLICIT';
  e.designDisposition = 'SOURCE_TRACED';
  e.permissionClaims.openapi = null;
  const errors = validateContract(c);
  assert.ok(errors.some((e: string) => e.includes('Permission claims lost')));
  assert.ok(errors.some((e: string) => e.includes('Permission conflict classification drift')));
  assert.ok(errors.some((e: string) => e.includes('Permission conflict must forbid action')));
});
test('56-A rejects altered Step-Up, audit and permission-source evidence', () => {
  const c = copy();
  const e = c.operationEvidence.find((x: any) => x.runtime?.stepUp && x.permissions.length);
  e.stepUp = 'NOT_REQUIRED';
  e.audit = 'VERIFIED_WITHOUT_EVIDENCE';
  e.permissionSources = {};
  const errors = validateContract(c);
  assert.ok(errors.some((e: string) => e.includes('Step-Up evidence drift')));
  assert.ok(errors.some((e: string) => e.includes('Audit evidence drift')));
  assert.ok(errors.some((e: string) => e.includes('Permission provenance drift')));
});
test('56-A rejects moving an operation across domain owners', () => {
  const c = copy();
  const e = c.operationEvidence.find((x: any) => x.runtime?.module === 'inventory');
  e.domain = 'finance';
  const errors = validateContract(c);
  assert.ok(errors.some((e: string) => e.includes('Runtime domain ownership drift')));
  assert.ok(errors.some((e: string) => e.includes('Surface domain ownership drift')));
});
test('56-A cannot invent assignable staff scopes', () => {
  const c = copy();
  c.roleBoundary.assignableScopeTypes.push('all_customers');
  assert.ok(validateContract(c).some((e: string) => e.includes('Assignable scope boundary drift')));
});
test('56-A foundation acceptance cannot waive execution restrictions or remove scope', () => {
  const c = copy();
  c.foundationAcceptance.runtimeReadinessCertified = true;
  c.sourceGaps[0].foundationDisposition.scopeRemoved = true;
  c.operationEvidence.find((e: any) => !e.runtime).executionAuthority = 'ALLOW';
  const errors = validateContract(c);
  assert.ok(errors.some((e: string) => e.includes('Foundation acceptance must not')));
  assert.ok(errors.some((e: string) => e.includes('Source gap cannot be waived')));
  assert.ok(errors.some((e: string) => e.includes('Execution authority drift')));
});
for (const [name, mutate, expected] of [
  ['removed provenance', (c: any) => { c.sources = []; }, 'Required source inventory incomplete'],
  ['fabricated baseline', (c: any) => { c.baseline = '0'.repeat(40); }, 'Canonical baseline/handoff identity drift'],
  ['missing H audit union', (c: any) => { c.acceptanceGates.find((g: any) => g.id === '56-H').requiredScreens = []; }, 'Gate ownership drift 56-H'],
  ['missing B journey', (c: any) => { c.acceptanceGates[0].requiredJourneys = []; }, 'Gate journey coverage drift 56-B'],
  ['missing inherited lifecycle', (c: any) => { const s = c.screenInventory.find((s: any) => s.id === 'AD-C-01'); s.requiredStates = s.requiredStates.filter((s: string) => s !== 'draft'); }, 'Missing inherited lifecycle state AD-C-01: draft'],
  ['missing reverse domain link', (c: any) => { c.domains.find((d: any) => d.id === 'inventory').screens = []; }, 'Reverse domain coverage drift inventory'],
  ['missing staff login persona', (c: any) => { c.screenInventory[0].actors = []; }, 'Surface actor coverage drift AD-B-01'],
  ['authenticated-only login entry', (c: any) => { c.tasks[0].entry = 'Staff session required before login'; }, 'Authentication entry must not require a pre-existing session'],
  ['missing shell security dependency', (c: any) => { c.shellAuthorityDependency.operations = []; }, 'B shell authority must cover all operation dependencies']
] as const) {
  test(`56-A rejects ${name}`, () => {
    const c = copy();
    mutate(c);
    assert.ok(validateContract(c).some((e: string) => e.includes(expected)));
  });
}
test('56-A rejects omission of a controller-only operation and hidden gap', () => {
  const c = copy();
  c.operationEvidence = c.operationEvidence.filter((e: any) => e.openapi);
  c.sourceGaps.pop();
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
test('56-A cannot start B or claim full Step 56 closure', () => {
  const c = copy();
  c.nextGateStatus = 'IN_PROGRESS';
  c.status = 'CLOSED_FINAL_GATE_PASS';
  c.pageWireframes.push('invented.svg');
  assert.ok(validateContract(c).some((e: string) => e.includes('56-B')));
  const run = spawnSync(process.execPath, ['scripts/validate-step56-admin-foundation.mjs', '--require-ready'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /FOUNDATION READY/);
});
test('56-A deterministic foundation outputs match and include zero wireframes', () => {
  const run = spawnSync(process.execPath, ['scripts/generate-step56-admin-foundation.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const manifest = JSON.parse(readFileSync('docs/13-product-design/step56-foundation/A/manifest.json', 'utf8'));
  assert.equal(manifest.pageWireframeCount, 0);
  assert.equal(manifest.generatedArtifacts.length, 3);
  assert.ok(manifest.generatedArtifacts.every((a: any) => !/\.(svg|png|html)$/.test(a.path)));
});
