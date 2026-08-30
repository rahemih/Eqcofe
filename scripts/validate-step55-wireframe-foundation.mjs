import { readFileSync } from 'node:fs';

const contractPath = 'docs/13-product-design/step55-storefront-wireframe-contract.json';
const requiredDocs = [
  'docs/13-product-design/STEP-55-STOREFRONT-WIREFRAME-FOUNDATION.md',
  'docs/13-product-design/STEP-55-ACCEPTANCE-AND-TRACEABILITY.md'
];
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const step53 = JSON.parse(readFileSync('docs/13-product-design/step53-experience-contract.json', 'utf8'));
const step54 = JSON.parse(readFileSync('docs/13-product-design/step54-design-system-contract.json', 'utf8'));
const errors = [];

if (contract.step !== 55 || contract.substep !== 'A' || contract.status !== 'A_COMPLETE_STEP_IN_PROGRESS') errors.push('Step 55-A status is invalid');
if (contract.canonicalSource !== 'repository' || contract.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Repository/Figma authority is invalid');
for (const key of ['language', 'direction', 'currency', 'walletAllowed', 'theme', 'accessibilityTarget']) {
  const upstream = key === 'theme' ? step54.foundation.defaultTheme : step54.foundation[key];
  if (contract.foundation[key] !== upstream) errors.push(`Foundation drift: ${key}`);
}
if (contract.foundation.step54ClosureBaseline !== '0e251696478e2cd91571c6103257e0c978c16c88') errors.push('Step 54 closure baseline drift');
if (JSON.stringify(contract.responsive.breakpoints) !== JSON.stringify(step54.responsive.breakpoints)) errors.push('Breakpoint drift from Step 54');
if (contract.responsive.contentMaxPx !== step54.responsive.contentMaxPx) errors.push('Content max drift from Step 54');
for (const size of ['compact', 'tablet', 'desktop']) {
  const local = contract.responsive.grid[size];
  const upstream = step54.responsive.grid[size];
  if (local.columns !== upstream.columns || local.marginPx !== upstream.margin || local.gutterPx !== upstream.gutter) errors.push(`Grid drift: ${size}`);
}

for (const file of requiredDocs) if (readFileSync(file, 'utf8').trim().length < 2500) errors.push(`${file}: expected a substantive artifact`);

const journeyIds = new Set(step53.journeys.filter((j) => j.id.startsWith('SJ-')).map((j) => j.id));
const componentIds = new Set(Object.keys(step54.components));
const validStates = new Set(Object.values(contract.stateCoverage.families).flat());
const screenIds = unique(contract.screenInventory, 'screenInventory');
const mappedJourneys = new Set();
let links = 0;
for (const screen of contract.screenInventory) {
  if (!/^SF-[B-F]-\d{2}$/.test(screen.id)) errors.push(`${screen.id}: invalid screen ID`);
  if (`55-${screen.id.slice(3, 4)}` !== screen.gate) errors.push(`${screen.id}: gate mismatch`);
  if (!screen.name || !screen.routeIntent) errors.push(`${screen.id}: name and routeIntent required`);
  for (const id of screen.journeys ?? []) {
    links += 1;
    mappedJourneys.add(id);
    if (!journeyIds.has(id)) errors.push(`${screen.id}: unknown journey ${id}`);
  }
  for (const id of screen.components ?? []) if (!componentIds.has(id)) errors.push(`${screen.id}: unknown Step 54 component ${id}`);
  if ((screen.requiredStates ?? []).length < 2) errors.push(`${screen.id}: insufficient state coverage`);
  for (const id of screen.requiredStates ?? []) if (!validStates.has(id)) errors.push(`${screen.id}: unknown state ${id}`);
}
for (const id of journeyIds) if (!mappedJourneys.has(id)) errors.push(`Unmapped storefront journey: ${id}`);

const gateIds = unique(contract.acceptanceGates, 'acceptanceGates');
for (const expected of ['55-B', '55-C', '55-D', '55-E', '55-F']) if (!gateIds.has(expected)) errors.push(`Missing gate: ${expected}`);
const ownedScreens = new Set();
for (const gate of contract.acceptanceGates) {
  const actual = contract.screenInventory.filter((s) => s.gate === gate.id).map((s) => s.id);
  if (JSON.stringify(actual) !== JSON.stringify(gate.requiredScreens)) errors.push(`${gate.id}: screen ownership drift`);
  for (const id of gate.requiredScreens) {
    if (!screenIds.has(id)) errors.push(`${gate.id}: unknown screen ${id}`);
    if (ownedScreens.has(id)) errors.push(`${gate.id}: duplicate ownership ${id}`);
    ownedScreens.add(id);
  }
  for (const id of gate.requiredJourneys) if (!journeyIds.has(id)) errors.push(`${gate.id}: unknown required journey ${id}`);
}
if (ownedScreens.size !== contract.screenInventory.length) errors.push('Every screen must belong to one later gate');
if (contract.screenInventory.length !== 37) errors.push('Frozen inventory must contain 37 screen obligations');
if ((contract.shell.regions ?? []).length < 8) errors.push('Global shell is incomplete');
if ((contract.stateCoverage.rules ?? []).length < 7) errors.push('Cross-cutting state rules are incomplete');
if ((contract.acceptance.perScreen ?? []).length < 6) errors.push('Per-screen acceptance is incomplete');
if (contract.scope.included.some((item) => /wireframe page/i.test(item)) || !contract.scope.excluded.some((item) => /55-B through 55-F/.test(item))) errors.push('55-A boundary is not explicit');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const referencedOperations = new Set(step53.journeys.filter((j) => mappedJourneys.has(j.id)).flatMap((j) => j.operations));
console.log(JSON.stringify({
  status: 'PASS', step: '55-A', screens: contract.screenInventory.length, later_gates: contract.acceptanceGates.length,
  storefront_journeys: mappedJourneys.size, screen_journey_links: links, inherited_openapi_operations: referencedOperations.size,
  shell_regions: contract.shell.regions.length, state_families: Object.keys(contract.stateCoverage.families).length,
  verification_widths: contract.responsive.verificationWidthsPx.length, step55_b_started: false
}, null, 2));

function unique(items, label) {
  const ids = new Set();
  for (const item of items ?? []) {
    if (!item.id) errors.push(`${label}: missing id`);
    else if (ids.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`);
    else ids.add(item.id);
  }
  return ids;
}
