import { readFileSync } from 'node:fs';

const contractPath = 'docs/13-product-design/step54-design-system-contract.json';
const requiredDocs = [
  'docs/13-product-design/STEP-54-DESIGN-SYSTEM-FOUNDATION.md',
  'docs/13-product-design/STEP-54-TYPOGRAPHY-CONTENT.md',
  'docs/13-product-design/STEP-54-RTL-RESPONSIVE.md',
  'docs/13-product-design/STEP-54-COMPONENT-CONTRACTS.md',
  'docs/13-product-design/STEP-54-ACCESSIBILITY.md'
];
const requiredRepositoryArtifacts = [
  'docs/13-product-design/generated/eqcofe-design-tokens.css',
  'docs/13-product-design/generated/eqcofe-design-system.manifest.json',
  'docs/13-product-design/generated/EQCOFE-DESIGN-SYSTEM-CATALOG.md'
];

const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const errors = [];

if (contract.step !== 54) errors.push('contract.step must be 54');
if (contract.foundation?.language !== 'fa-IR' || contract.foundation?.direction !== 'rtl') {
  errors.push('Step 54 must remain Persian-first RTL');
}
if (contract.foundation?.currency !== 'Toman' || contract.foundation?.walletAllowed !== false) {
  errors.push('Toman/no-Wallet product boundary is required');
}
if (contract.foundation?.brownAllowed !== false) errors.push('Brown palette must remain prohibited');
if (contract.foundation?.accessibilityTarget !== 'WCAG 2.2 AA') errors.push('WCAG 2.2 AA target is required');
if (contract.status !== 'A11_CANDIDATE' && contract.status !== 'COMPLETE') {
  errors.push('Step 54 contract must be an A11 candidate or complete');
}
if (contract.repositoryLibrary?.canonicalSource !== true) {
  errors.push('The free repository library must be the canonical design-system source');
}
if (contract.repositoryLibrary?.figmaMirrorStatus !== 'PARTIAL_FREE_TIER') {
  errors.push('Figma must remain explicitly recorded as a partial free-tier mirror');
}
if (JSON.stringify(contract.repositoryLibrary?.artifacts) !== JSON.stringify(requiredRepositoryArtifacts)) {
  errors.push('Repository-library artifact list does not match the canonical output set');
}
if (JSON.stringify(contract.foundation?.themes) !== JSON.stringify(['light'])) {
  errors.push('Step 54 canonical theme must remain Light-only until a later approved enhancement');
}
if (contract.semanticColor?.dark) errors.push('Dark semantic values must not be claimed in the Light-only Step 54 contract');

for (const file of requiredDocs) {
  const text = readFileSync(file, 'utf8');
  if (text.trim().length < 900) errors.push(`${file}: expected a substantive Step-54 artifact`);
}
for (const file of requiredRepositoryArtifacts) {
  const text = readFileSync(file, 'utf8');
  if (text.trim().length < 400) errors.push(`${file}: expected a substantive generated artifact`);
}

const primitiveColors = contract.primitives?.color ?? {};
for (const [name, value] of Object.entries(primitiveColors)) {
  if (/brown|coffee|sepia|taupe/i.test(name)) errors.push(`Prohibited brown-family token: ${name}`);
  if (!/^#[0-9A-F]{6}$/i.test(value)) errors.push(`Invalid color value ${name}: ${value}`);
}

const requiredCollections = new Set(contract.figmaScope?.collections ?? []);
for (const name of ['Primitives', 'Semantic Color', 'Spacing & Size']) {
  if (!requiredCollections.has(name)) errors.push(`Missing Figma collection: ${name}`);
}
if ((contract.figmaScope?.textStyles ?? []).length < 12) errors.push('At least 12 text styles are required');
if ((contract.figmaScope?.effectStyles ?? []).length < 4) errors.push('At least 4 effect styles are required');

for (const [name, style] of Object.entries(contract.typography?.styles ?? {})) {
  if (!Number.isInteger(style.fontSize) || style.fontSize < 12) errors.push(`${name}: fontSize must be at least 12px`);
  if (!Number.isInteger(style.lineHeight) || style.lineHeight <= style.fontSize) errors.push(`${name}: lineHeight must exceed fontSize`);
  if (![400, 500, 600, 700].includes(style.weight)) errors.push(`${name}: unsupported weight ${style.weight}`);
}

const spacing = Object.values(contract.primitives?.spacing ?? {});
if (spacing.length < 12 || !spacing.includes(4) || !spacing.includes(44) && contract.primitives?.size?.['touch/min'] !== 44) {
  errors.push('Spacing and minimum touch scale are incomplete');
}
if (contract.accessibility?.minimumTargetPx < 44) errors.push('Internal target-size requirement must be at least 44px');
if (contract.accessibility?.textContrast?.normal < 4.5) errors.push('Normal text contrast must be at least 4.5:1');
if (contract.accessibility?.nonTextContrast < 3 || contract.accessibility?.focusContrast < 3) {
  errors.push('Non-text and focus contrast must be at least 3:1');
}
if ((contract.accessibility?.requirements ?? []).length < 12) errors.push('Accessibility acceptance coverage is incomplete');

const requiredComponents = ['Button', 'IconButton', 'TextField', 'Select', 'ChoiceControl', 'Badge', 'Alert', 'Card', 'Dialog', 'Tabs', 'Pagination', 'DataTable', 'StatePanel'];
for (const name of requiredComponents) {
  const component = contract.components?.[name];
  if (!component) {
    errors.push(`Missing component contract: ${name}`);
    continue;
  }
  if (!component.variants || Object.keys(component.variants).length === 0) errors.push(`${name}: variants are required`);
  if (!Array.isArray(component.a11y) || component.a11y.length < 2) errors.push(`${name}: accessibility contract is incomplete`);
}

for (const family of ['load', 'empty', 'input', 'access', 'provider', 'mutation', 'lifecycle', 'operations']) {
  if (!Array.isArray(contract.statePatterns?.[family]) || contract.statePatterns[family].length < 3) {
    errors.push(`State vocabulary is incomplete: ${family}`);
  }
}

const grid = contract.responsive?.grid ?? {};
if (grid.compact?.columns !== 4 || grid.tablet?.columns !== 8 || grid.desktop?.columns !== 12) {
  errors.push('Responsive grid must define 4/8/12 columns');
}
if ((contract.responsive?.rules ?? []).length < 5) errors.push('RTL/responsive rules are incomplete');

validateContrast('light text/primary on bg/surface', resolve('light', 'text/primary'), resolve('light', 'bg/surface'), 4.5);
validateContrast('light text/secondary on bg/surface', resolve('light', 'text/secondary'), resolve('light', 'bg/surface'), 4.5);
validateContrast('light primary action with inverse text', resolve('light', 'action/primary'), resolve('light', 'text/inverse'), 4.5);
validateContrast('light focus on surface', resolve('light', 'action/focus'), resolve('light', 'bg/surface'), 3);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  step: 54,
  themes: contract.foundation.themes.length,
  primitive_colors: Object.keys(primitiveColors).length,
  semantic_roles: Object.keys(contract.semanticColor.light).length,
  typography_styles: Object.keys(contract.typography.styles).length,
  component_families: Object.keys(contract.components).length,
  state_families: Object.keys(contract.statePatterns).length,
  accessibility_requirements: contract.accessibility.requirements.length,
  repository_artifacts: requiredRepositoryArtifacts.length,
  figma_mirror: contract.repositoryLibrary.figmaMirrorStatus,
  brown_tokens: 0
}, null, 2));

function resolve(mode, role) {
  const primitive = contract.semanticColor?.[mode]?.[role];
  const value = primitiveColors[primitive];
  if (!value) errors.push(`Unresolved semantic alias ${mode}/${role}: ${primitive}`);
  return value ?? '#000000';
}

function validateContrast(label, foreground, background, minimum) {
  const ratio = contrast(foreground, background);
  if (ratio + Number.EPSILON < minimum) errors.push(`${label}: ${ratio.toFixed(2)}:1 is below ${minimum}:1`);
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
