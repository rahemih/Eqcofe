import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(readFileSync('docs/13-product-design/step54-design-system-contract.json', 'utf8'));
const contractSource = readFileSync('docs/13-product-design/step54-design-system-contract.json', 'utf8');
const manifest = JSON.parse(readFileSync('docs/13-product-design/generated/eqcofe-design-system.manifest.json', 'utf8'));
const tokensCss = readFileSync('docs/13-product-design/generated/eqcofe-design-tokens.css', 'utf8');

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

test('Step 54 repository library is canonical and Figma remains a truthful free-tier mirror', () => {
  assert.equal(contract.repositoryLibrary.canonicalSource, true);
  assert.equal(contract.repositoryLibrary.figmaMirrorStatus, 'PARTIAL_FREE_TIER');
  assert.equal(manifest.canonicalLibrary, 'repository');
  assert.equal(manifest.figmaMirror.role, 'optional-free-tier-companion');
  assert.equal(manifest.sourceSha256, createHash('sha256').update(contractSource).digest('hex'));
});

test('Step 54 generated manifest covers every token, style and component contract', () => {
  assert.deepEqual(manifest.tokenSummary, {
    primitiveColors: 35,
    semanticColors: 19,
    metrics: 34,
    typographyStyles: 13,
    effectStyles: 4
  });
  assert.equal(manifest.components.length, 13);
  assert.equal(manifest.components.every((component: { variantCombinationCount: number }) => component.variantCombinationCount > 0), true);
});

test('Step 54 generated CSS exposes semantic aliases and the complete metric scale', () => {
  assert.match(tokensCss, /--eq-color-bg-canvas: var\(--eq-neutral-50\);/);
  assert.match(tokensCss, /--eq-size-touch-min: 44px;/);
  assert.match(tokensCss, /--eq-duration-normal: 200ms;/);
  assert.doesNotMatch(tokensCss, /brown|coffee|sepia|taupe/i);
});
