import { existsSync, readFileSync } from 'node:fs';

const contractPath = 'docs/13-product-design/step55-storefront-wireframe-contract.json';
const requiredDocs = [
  'docs/13-product-design/STEP-55-STOREFRONT-WIREFRAME-FOUNDATION.md',
  'docs/13-product-design/STEP-55-ACCEPTANCE-AND-TRACEABILITY.md'
];
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const step53 = JSON.parse(readFileSync('docs/13-product-design/step53-experience-contract.json', 'utf8'));
const step54 = JSON.parse(readFileSync('docs/13-product-design/step54-design-system-contract.json', 'utf8'));
const gateBPath = 'docs/13-product-design/step55-discovery-wireframes.json';
const gateB = JSON.parse(readFileSync(gateBPath, 'utf8'));
const gateCPath = 'docs/13-product-design/step55-product-evaluation-wireframes.json';
const gateC = JSON.parse(readFileSync(gateCPath, 'utf8'));
const errors = [];

if (contract.step !== 55 || contract.substep !== 'C' || contract.status !== 'C_COMPLETE_STEP_IN_PROGRESS') errors.push('Step 55-C status is invalid');
if (contract.canonicalSource !== 'repository' || contract.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Repository/Figma authority is invalid');
if (JSON.stringify(contract.completedGates) !== JSON.stringify(['55-A', '55-B', '55-C']) || contract.nextGate !== '55-D') errors.push('Completed/next gate state is invalid');
if (contract.gateBContract !== gateBPath) errors.push('Gate B contract pointer is invalid');
if (contract.gateCContract !== gateCPath) errors.push('Gate C contract pointer is invalid');
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
if (!contract.scope.included.some((item) => /Step 55-C product detail/.test(item)) || !contract.scope.excluded.some((item) => /55-D through 55-F/.test(item))) errors.push('55-C boundary is not explicit');

validateGateB();
validateGateC();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const referencedOperations = new Set(step53.journeys.filter((j) => mappedJourneys.has(j.id)).flatMap((j) => j.operations));
console.log(JSON.stringify({
  status: 'PASS', step: '55-C', screens: contract.screenInventory.length, completed_gate_b_screens: gateB.screens.length,
  completed_gate_c_screens: gateC.screens.length, gate_b_frames: gateB.acceptance.expectedFrameCount,
  gate_c_frames: gateC.acceptance.expectedFrameCount, later_gates: contract.acceptanceGates.length,
  storefront_journeys: mappedJourneys.size, screen_journey_links: links, inherited_openapi_operations: referencedOperations.size,
  shell_regions: contract.shell.regions.length, state_families: Object.keys(contract.stateCoverage.families).length,
  verification_widths: contract.responsive.verificationWidthsPx.length, step55_d_started: false
}, null, 2));

function validateGateB() {
  if (gateB.step !== 55 || gateB.substep !== 'B' || gateB.status !== 'B_COMPLETE_STEP_IN_PROGRESS') errors.push('Gate B source status is invalid');
  if (gateB.baseline !== '75b117582b2e6315091c0e99459ad14b9a4fea0c') errors.push('Gate B baseline drift');
  if (gateB.canonicalSource !== 'repository' || gateB.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Gate B authority is invalid');
  if (gateB.language !== 'fa-IR' || gateB.direction !== 'rtl' || gateB.currency !== 'Toman' || gateB.walletAllowed !== false || gateB.theme !== 'light') errors.push('Gate B product foundation drift');
  if (JSON.stringify(gateB.acceptance.requiredWidths) !== JSON.stringify(contract.responsive.verificationWidthsPx)) errors.push('Gate B verification widths drift');
  if (gateB.acceptance.zoomPercent !== 400 || gateB.acceptance.minimumTargetPx !== 44) errors.push('Gate B accessibility thresholds drift');
  if (gateB.screens.length !== 6 || gateB.acceptance.screenCount !== 6 || gateB.acceptance.expectedFrameCount !== 24) errors.push('Gate B screen/frame count drift');

  const expectedB = contract.acceptanceGates.find((gate) => gate.id === '55-B').requiredScreens;
  if (JSON.stringify(gateB.screens.map((screen) => screen.id)) !== JSON.stringify(expectedB)) errors.push('Gate B screen inventory drift');
  const bJourneyIds = new Set(gateB.journeys);
  if (JSON.stringify([...bJourneyIds]) !== JSON.stringify(['SJ-01', 'SJ-11'])) errors.push('Gate B journey set drift');
  const journeyOperations = new Set(step53.journeys.filter((journey) => bJourneyIds.has(journey.id)).flatMap((journey) => journey.operations));
  const root = 'docs/13-product-design/step55-wireframes/B';
  let frameCount = 0;

  for (const screen of gateB.screens) {
    const frozen = contract.screenInventory.find((item) => item.id === screen.id);
    if (!frozen) {
      errors.push(`${screen.id}: not frozen upstream`);
      continue;
    }
    if (screen.routeIntent !== frozen.routeIntent) errors.push(`${screen.id}: route intent drift`);
    if (JSON.stringify(screen.journeys) !== JSON.stringify(frozen.journeys)) errors.push(`${screen.id}: journey drift`);
    if (JSON.stringify(screen.components) !== JSON.stringify(frozen.components)) errors.push(`${screen.id}: component drift`);
    if (JSON.stringify(screen.states.map((state) => state.id)) !== JSON.stringify(frozen.requiredStates)) errors.push(`${screen.id}: state drift`);
    if (!screen.primaryTask || !screen.primaryAction || !screen.recoveryAction || screen.contentPriority.length < 4) errors.push(`${screen.id}: task/recovery/content priority incomplete`);
    for (const operation of screen.operations) if (!journeyOperations.has(operation)) errors.push(`${screen.id}: operation outside mapped journeys: ${operation}`);

    const folder = `${root}/${screen.id}`;
    for (const companion of contract.artifactGovernance.requiredCompanion) {
      const path = `${folder}/${companion}`;
      if (!existsSync(path)) errors.push(`${screen.id}: missing ${companion}`);
      else if (readFileSync(path, 'utf8').trim().length < (companion === 'README.md' ? 2200 : 900)) errors.push(`${screen.id}: ${companion} is not substantive`);
    }

    const frames = screen.states.flatMap((state, index) => {
      const values = [{ width: 320, state: state.id }];
      if (index === 0) values.push({ width: 1440, state: state.id });
      return values;
    });
    frameCount += frames.length;
    for (const frame of frames) {
      const filename = `${screen.id}--${frame.width}--${frame.state}--v${gateB.revision}.svg`;
      const path = `${folder}/${filename}`;
      if (!existsSync(path)) {
        errors.push(`${screen.id}: missing frame ${filename}`);
        continue;
      }
      const svg = readFileSync(path, 'utf8');
      if (!svg.startsWith('<svg ') || !svg.includes('<title id="title">') || !svg.includes('<desc id="desc">')) errors.push(`${filename}: accessible SVG metadata missing`);
      if (!svg.includes(screen.id) || !svg.includes(frame.state) || !svg.includes(`${frame.width}px`)) errors.push(`${filename}: frame annotations incomplete`);
      if (/کیف پول|lorem ipsum|<image\b|data:image/i.test(svg)) errors.push(`${filename}: forbidden artifact content`);
    }

    if (existsSync(`${folder}/traceability.json`)) {
      const trace = JSON.parse(readFileSync(`${folder}/traceability.json`, 'utf8'));
      if (trace.screenId !== screen.id || trace.status !== 'COMPLETE' || trace.responsiveEvidence.length !== 6) errors.push(`${screen.id}: traceability identity/responsive evidence invalid`);
      if (trace.boundary.highFidelity || trace.boundary.runtimeImplementation || trace.boundary.apiMutation || trace.boundary.businessRuleMutation || trace.boundary.inventedBrandAsset || trace.boundary.paidDependency) errors.push(`${screen.id}: boundary violation`);
    }
  }

  if (frameCount !== gateB.acceptance.expectedFrameCount) errors.push('Gate B generated frame plan is incomplete');
  const manifestPath = `${root}/gate-b-manifest.json`;
  if (!existsSync(manifestPath)) errors.push('Gate B manifest missing');
  else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.screenCount !== 6 || manifest.frameCount !== 24 || manifest.sourceContract !== gateBPath) errors.push('Gate B manifest summary drift');
  }
  if (!existsSync(`${root}/README.md`) || readFileSync(`${root}/README.md`, 'utf8').trim().length < 2500) errors.push('Gate B overview is missing or not substantive');
}

function validateGateC() {
  if (gateC.step !== 55 || gateC.substep !== 'C' || gateC.status !== 'C_COMPLETE_STEP_IN_PROGRESS') errors.push('Gate C source status is invalid');
  if (gateC.baseline !== '8e9501c7d489cfee143851e4e1a043442ee64f09') errors.push('Gate C baseline drift');
  if (gateC.canonicalSource !== 'repository' || gateC.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Gate C authority is invalid');
  if (gateC.language !== 'fa-IR' || gateC.direction !== 'rtl' || gateC.currency !== 'Toman' || gateC.walletAllowed !== false || gateC.theme !== 'light') errors.push('Gate C product foundation drift');
  if (JSON.stringify(gateC.acceptance.requiredWidths) !== JSON.stringify(contract.responsive.verificationWidthsPx)) errors.push('Gate C verification widths drift');
  if (gateC.acceptance.zoomPercent !== 400 || gateC.acceptance.minimumTargetPx !== 44) errors.push('Gate C accessibility thresholds drift');
  if (gateC.screens.length !== 5 || gateC.acceptance.screenCount !== 5 || gateC.acceptance.expectedFrameCount !== 20) errors.push('Gate C screen/frame count drift');

  const expectedC = contract.acceptanceGates.find((gate) => gate.id === '55-C').requiredScreens;
  if (JSON.stringify(gateC.screens.map((screen) => screen.id)) !== JSON.stringify(expectedC)) errors.push('Gate C screen inventory drift');
  if (JSON.stringify(gateC.journeys) !== JSON.stringify(['SJ-01', 'SJ-02', 'SJ-03', 'SJ-11', 'SJ-12'])) errors.push('Gate C journey set drift');
  const journeys = new Map(step53.journeys.map((journey) => [journey.id, journey]));
  const root = 'docs/13-product-design/step55-wireframes/C';
  let frameCount = 0;

  for (const screen of gateC.screens) {
    const frozen = contract.screenInventory.find((item) => item.id === screen.id);
    if (!frozen) {
      errors.push(`${screen.id}: not frozen upstream`);
      continue;
    }
    if (screen.routeIntent !== frozen.routeIntent) errors.push(`${screen.id}: route intent drift`);
    if (JSON.stringify(screen.journeys) !== JSON.stringify(frozen.journeys)) errors.push(`${screen.id}: journey drift`);
    if (JSON.stringify(screen.components) !== JSON.stringify(frozen.components)) errors.push(`${screen.id}: component drift`);
    if (JSON.stringify(screen.states.map((state) => state.id)) !== JSON.stringify(frozen.requiredStates)) errors.push(`${screen.id}: state drift`);
    if (!screen.primaryTask || !screen.primaryAction || !screen.recoveryAction || screen.contentPriority.length < 4) errors.push(`${screen.id}: task/recovery/content priority incomplete`);
    const allowedOperations = new Set(screen.journeys.flatMap((id) => journeys.get(id)?.operations ?? []));
    for (const operation of screen.operations) if (!allowedOperations.has(operation)) errors.push(`${screen.id}: operation outside mapped journeys: ${operation}`);

    const folder = `${root}/${screen.id}`;
    for (const companion of gateC.acceptance.requiredCompanions) {
      const path = `${folder}/${companion}`;
      if (!existsSync(path)) errors.push(`${screen.id}: missing ${companion}`);
      else if (readFileSync(path, 'utf8').trim().length < (companion === 'README.md' ? 1700 : 800)) errors.push(`${screen.id}: ${companion} is not substantive`);
    }

    const frames = screen.states.flatMap((state, index) => [{ width: 320, state: state.id }, ...(index === 0 ? [{ width: 1440, state: state.id }] : [])]);
    frameCount += frames.length;
    for (const frame of frames) {
      const filename = `${screen.id}--${frame.width}--${frame.state}--v${gateC.revision}.svg`;
      const path = `${folder}/${filename}`;
      if (!existsSync(path)) {
        errors.push(`${screen.id}: missing frame ${filename}`);
        continue;
      }
      const svg = readFileSync(path, 'utf8');
      if (!svg.startsWith('<svg ') || !svg.includes('<title id="title">') || !svg.includes('<desc id="desc">')) errors.push(`${filename}: accessible SVG metadata missing`);
      if (!svg.includes(screen.id) || !svg.includes(frame.state) || !svg.includes(`${frame.width}px`)) errors.push(`${filename}: frame annotations incomplete`);
      if (/کیف پول|lorem ipsum|<image\b|data:image/i.test(svg)) errors.push(`${filename}: forbidden artifact content`);
    }

    if (existsSync(`${folder}/traceability.json`)) {
      const trace = JSON.parse(readFileSync(`${folder}/traceability.json`, 'utf8'));
      if (trace.screenId !== screen.id || trace.status !== 'COMPLETE' || trace.responsiveEvidence.length !== 6) errors.push(`${screen.id}: traceability identity/responsive evidence invalid`);
      if (Object.values(trace.boundary).some(Boolean)) errors.push(`${screen.id}: boundary violation`);
      if (trace.zoomEvidence.horizontalTwoAxisScroll !== false) errors.push(`${screen.id}: 400% zoom reflow is not bounded`);
    }
  }

  if (frameCount !== gateC.acceptance.expectedFrameCount) errors.push('Gate C generated frame plan is incomplete');
  const manifestPath = `${root}/gate-c-manifest.json`;
  if (!existsSync(manifestPath)) errors.push('Gate C manifest missing');
  else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.screenCount !== 5 || manifest.frameCount !== 20 || manifest.sourceContract !== gateCPath || manifest.generatedArtifacts.length !== 36) errors.push('Gate C manifest summary drift');
  }
  if (!existsSync(`${root}/README.md`) || readFileSync(`${root}/README.md`, 'utf8').trim().length < 2000) errors.push('Gate C overview is missing or not substantive');
  if (!gateC.crossCutting.comparison.some((rule) => /چهار محصول/.test(rule) && /دسته/.test(rule))) errors.push('Gate C comparison boundary is incomplete');
  if (!gateC.crossCutting.customerActions.some((rule) => /customer-owned/.test(rule))) errors.push('Gate C customer ownership boundary is incomplete');
}

function unique(items, label) {
  const ids = new Set();
  for (const item of items ?? []) {
    if (!item.id) errors.push(`${label}: missing id`);
    else if (ids.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`);
    else ids.add(item.id);
  }
  return ids;
}
