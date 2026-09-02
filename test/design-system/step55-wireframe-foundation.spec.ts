import assert from 'node:assert/strict';
import test from 'node:test';

const contract = require('../../docs/13-product-design/step55-storefront-wireframe-contract.json');
const step53 = require('../../docs/13-product-design/step53-experience-contract.json');
const step54 = require('../../docs/13-product-design/step54-design-system-contract.json');

test('Step 55-A preserves the Persian RTL, Toman, no-Wallet and repository-canonical boundaries', () => {
  assert.equal(contract.foundation.language, 'fa-IR');
  assert.equal(contract.foundation.direction, 'rtl');
  assert.equal(contract.foundation.currency, 'Toman');
  assert.equal(contract.foundation.walletAllowed, false);
  assert.equal(contract.canonicalSource, 'repository');
  assert.equal(contract.figmaMirror, 'OPTIONAL_NOT_REQUIRED');
});

test('Step 55-A inherits the exact Step 54 breakpoint and 4/8/12 grid foundation', () => {
  assert.deepEqual(contract.responsive.breakpoints, step54.responsive.breakpoints);
  assert.deepEqual(Object.values(contract.responsive.grid).map((item: { columns: number }) => item.columns), [4, 8, 12]);
  assert.deepEqual(contract.responsive.verificationWidthsPx, [320, 360, 600, 840, 1200, 1440]);
});

test('Step 55-E preserves the frozen 37-screen inventory while completing account and after-sales', () => {
  assert.equal(contract.status, 'E_COMPLETE_STEP_IN_PROGRESS');
  assert.deepEqual(contract.completedGates, ['55-A', '55-B', '55-C', '55-D', '55-E']);
  assert.equal(contract.nextGate, '55-F');
  assert.equal(contract.screenInventory.length, 37);
  assert.deepEqual(contract.acceptanceGates.map((gate: { id: string }) => gate.id), ['55-B', '55-C', '55-D', '55-E', '55-F']);
  assert.match(contract.scope.excluded.join(' '), /Step 55-F/);
});

test('Step 55 inventory covers every Step 53 storefront journey', () => {
  const expected = step53.journeys.filter((journey: { id: string }) => journey.id.startsWith('SJ-')).map((journey: { id: string }) => journey.id);
  const actual = new Set(contract.screenInventory.flatMap((screen: { journeys: string[] }) => screen.journeys));
  assert.deepEqual(expected.filter((id: string) => !actual.has(id)), []);
});

test('Step 55 screens only reference Step 54 component families and declared states', () => {
  const components = new Set(Object.keys(step54.components));
  const states = new Set(Object.values(contract.stateCoverage.families).flat());
  assert.equal(contract.screenInventory.every((screen: { components: string[] }) => screen.components.every((id) => components.has(id))), true);
  assert.equal(contract.screenInventory.every((screen: { requiredStates: string[] }) => screen.requiredStates.every((id) => states.has(id))), true);
});

test('Step 55 global shell and accessibility handoff remain substantive', () => {
  assert.equal(contract.shell.regions.length, 8);
  assert.ok(contract.responsive.rules.some((rule: string) => /400 percent/.test(rule)));
  assert.ok(contract.wireframeConventions.contentRules.some((rule: string) => /تومان/.test(rule)));
  assert.ok(contract.acceptance.perScreen.some((rule: string) => /44px/.test(rule)));
});
