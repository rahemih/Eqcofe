import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(readFileSync('docs/13-product-design/step54-design-system-contract.json', 'utf8'));

test('Step 54 preserves Persian RTL, Toman, no-Wallet and no-Brown boundaries', () => {
  assert.equal(contract.foundation.language, 'fa-IR');
  assert.equal(contract.foundation.direction, 'rtl');
  assert.equal(contract.foundation.currency, 'Toman');
  assert.equal(contract.foundation.walletAllowed, false);
  assert.equal(contract.foundation.brownAllowed, false);
});

test('Step 54 freezes the canonical Light-only theme', () => {
  assert.deepEqual(contract.foundation.themes, ['light']);
  assert.deepEqual(contract.figmaScope.modes['Semantic Color'], ['Light']);
  assert.equal(contract.semanticColor.dark, undefined);
});

test('Step 54 covers the required token and component foundation', () => {
  assert.equal(Object.keys(contract.primitives.color).length, 35);
  assert.equal(Object.keys(contract.semanticColor.light).length, 19);
  assert.equal(Object.keys(contract.typography.styles).length, 13);
  assert.equal(Object.keys(contract.components).length, 13);
});

test('Step 54 responsive grid is 4/8/12 and touch target is 44px', () => {
  assert.equal(contract.responsive.grid.compact.columns, 4);
  assert.equal(contract.responsive.grid.tablet.columns, 8);
  assert.equal(contract.responsive.grid.desktop.columns, 12);
  assert.equal(contract.accessibility.minimumTargetPx, 44);
});

test('Step 54 accessibility contract targets WCAG 2.2 AA without claiming conformance', () => {
  assert.equal(contract.foundation.accessibilityTarget, 'WCAG 2.2 AA');
  assert.match(contract.accessibility.conformance, /target/i);
  assert.equal(contract.accessibility.requirements.length, 12);
  assert.equal(contract.accessibility.textContrast.normal, 4.5);
});
