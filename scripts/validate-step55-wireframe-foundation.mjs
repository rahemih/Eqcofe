import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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
const gateDPath = 'docs/13-product-design/step55-checkout-payment-wireframes.json';
const gateD = JSON.parse(readFileSync(gateDPath, 'utf8'));
const gateEPath = 'docs/13-product-design/step55-account-wholesale-after-sales-wireframes.json';
const gateE = JSON.parse(readFileSync(gateEPath, 'utf8'));
const gateFPath = 'docs/13-product-design/step55-content-policy-final-audit-wireframes.json';
const gateF = JSON.parse(readFileSync(gateFPath, 'utf8'));
const errors = [];

if (contract.step !== 55 || contract.substep !== 'F' || !['F_COMPLETE_STEP_CLOSURE_CANDIDATE', 'CLOSED_FINAL_GATE_PASS'].includes(contract.status)) errors.push('Step 55-F status is invalid');
if (contract.canonicalSource !== 'repository' || contract.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Repository/Figma authority is invalid');
if (JSON.stringify(contract.completedGates) !== JSON.stringify(['55-A', '55-B', '55-C', '55-D', '55-E', '55-F']) || contract.nextGate !== null) errors.push('Completed/next gate state is invalid');
if (contract.gateBContract !== gateBPath) errors.push('Gate B contract pointer is invalid');
if (contract.gateCContract !== gateCPath) errors.push('Gate C contract pointer is invalid');
if (contract.gateDContract !== gateDPath) errors.push('Gate D contract pointer is invalid');
if (contract.gateEContract !== gateEPath) errors.push('Gate E contract pointer is invalid');
if (contract.gateFContract !== gateFPath) errors.push('Gate F contract pointer is invalid');
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
if (!contract.scope.included.some((item) => /Step 55-F article/.test(item)) || !contract.scope.excluded.some((item) => /Step 56/.test(item))) errors.push('55-F boundary is not explicit');

validateGateB();
validateGateC();
validateGateD();
validateGateE();
validateGateF();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const referencedOperations = new Set(step53.journeys.filter((j) => mappedJourneys.has(j.id)).flatMap((j) => j.operations));
console.log(JSON.stringify({
  status: 'PASS', step: '55-F', screens: contract.screenInventory.length, completed_gate_b_screens: gateB.screens.length,
  completed_gate_c_screens: gateC.screens.length, gate_b_frames: gateB.acceptance.expectedFrameCount,
  completed_gate_d_screens: gateD.screens.length, gate_c_frames: gateC.acceptance.expectedFrameCount,
  gate_d_frames: gateD.acceptance.expectedFrameCount, completed_gate_e_screens: gateE.screens.length, gate_e_frames: gateE.acceptance.expectedFrameCount,
  completed_gate_f_screens: gateF.screens.length, gate_f_frames: gateF.acceptance.expectedFrameCount, audited_frames: gateF.audit.frameCount, later_gates: contract.acceptanceGates.length,
  storefront_journeys: mappedJourneys.size, screen_journey_links: links, inherited_openapi_operations: referencedOperations.size,
  shell_regions: contract.shell.regions.length, state_families: Object.keys(contract.stateCoverage.families).length,
  verification_widths: contract.responsive.verificationWidthsPx.length, step55_f_complete: true, closure_status: contract.status
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

function validateGateD() {
  if (gateD.step !== 55 || gateD.substep !== 'D' || gateD.status !== 'D_COMPLETE_STEP_IN_PROGRESS') errors.push('Gate D source status is invalid');
  if (gateD.baseline !== '6c866afbdae6499d60df5656e92e78da20923811') errors.push('Gate D baseline drift');
  if (gateD.canonicalSource !== 'repository' || gateD.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Gate D authority is invalid');
  if (gateD.language !== 'fa-IR' || gateD.direction !== 'rtl' || gateD.currency !== 'Toman' || gateD.walletAllowed !== false || gateD.theme !== 'light') errors.push('Gate D foundation drift');
  if (JSON.stringify(gateD.acceptance.requiredWidths) !== JSON.stringify(contract.responsive.verificationWidthsPx)) errors.push('Gate D verification widths drift');
  if (gateD.acceptance.zoomPercent !== 400 || gateD.acceptance.minimumTargetPx !== 44) errors.push('Gate D accessibility thresholds drift');
  if (gateD.screens.length !== 7 || gateD.acceptance.screenCount !== 7 || gateD.acceptance.expectedFrameCount !== 28) errors.push('Gate D screen/frame count drift');
  const expectedD = contract.acceptanceGates.find((gate) => gate.id === '55-D').requiredScreens;
  if (JSON.stringify(gateD.screens.map((screen) => screen.id)) !== JSON.stringify(expectedD)) errors.push('Gate D screen inventory drift');
  if (JSON.stringify(gateD.journeys) !== JSON.stringify(['SJ-03', 'SJ-04', 'SJ-05', 'SJ-06', 'SJ-07', 'SJ-11'])) errors.push('Gate D journey set drift');
  const journeys = new Map(step53.journeys.map((journey) => [journey.id, journey]));
  const root = 'docs/13-product-design/step55-wireframes/D';
  let frameCount = 0;
  for (const screen of gateD.screens) {
    const frozen = contract.screenInventory.find((item) => item.id === screen.id);
    if (!frozen) { errors.push(`${screen.id}: not frozen upstream`); continue; }
    if (screen.routeIntent !== frozen.routeIntent) errors.push(`${screen.id}: route intent drift`);
    if (JSON.stringify(screen.journeys) !== JSON.stringify(frozen.journeys)) errors.push(`${screen.id}: journey drift`);
    if (JSON.stringify(screen.components) !== JSON.stringify(frozen.components)) errors.push(`${screen.id}: component drift`);
    if (JSON.stringify(screen.states.map((state) => state.id)) !== JSON.stringify(frozen.requiredStates)) errors.push(`${screen.id}: state drift`);
    const allowedOperations = new Set(screen.journeys.flatMap((id) => journeys.get(id)?.operations ?? []));
    for (const operation of screen.operations) if (!allowedOperations.has(operation)) errors.push(`${screen.id}: operation outside mapped journeys: ${operation}`);
    if (!screen.primaryTask || !screen.primaryAction || !screen.recoveryAction || screen.contentPriority.length < 4) errors.push(`${screen.id}: task/recovery/content priority incomplete`);
    const folder = `${root}/${screen.id}`;
    for (const companion of gateD.acceptance.requiredCompanions) {
      const path = `${folder}/${companion}`;
      if (!existsSync(path)) errors.push(`${screen.id}: missing ${companion}`);
      else if (readFileSync(path, 'utf8').trim().length < (companion === 'README.md' ? 1600 : 700)) errors.push(`${screen.id}: ${companion} is not substantive`);
    }
    const frames = screen.states.flatMap((state, index) => [{width:320,state:state.id}, ...(index === 0 ? [{width:1440,state:state.id}] : [])]);
    frameCount += frames.length;
    for (const frame of frames) {
      const filename = `${screen.id}--${frame.width}--${frame.state}--v${gateD.revision}.svg`, path = `${folder}/${filename}`;
      if (!existsSync(path)) { errors.push(`${screen.id}: missing frame ${filename}`); continue; }
      const svg = readFileSync(path, 'utf8');
      if (!svg.startsWith('<svg ') || !svg.includes('<title id="title">') || !svg.includes('<desc id="desc">')) errors.push(`${filename}: accessible SVG metadata missing`);
      if (!svg.includes(screen.id) || !svg.includes(frame.state) || !svg.includes(`${frame.width}px`)) errors.push(`${filename}: frame annotations incomplete`);
      if (/کیف پول|lorem ipsum|<image\b|data:image/i.test(svg)) errors.push(`${filename}: forbidden artifact content`);
    }
    if (existsSync(`${folder}/traceability.json`)) {
      const trace = JSON.parse(readFileSync(`${folder}/traceability.json`, 'utf8'));
      if (trace.screenId !== screen.id || trace.status !== 'COMPLETE' || trace.responsiveEvidence.length !== 6) errors.push(`${screen.id}: traceability invalid`);
      if (Object.values(trace.boundary).some(Boolean)) errors.push(`${screen.id}: boundary violation`);
      if (trace.zoomEvidence.horizontalTwoAxisScroll !== false) errors.push(`${screen.id}: zoom reflow is not bounded`);
    }
  }
  if (frameCount !== gateD.acceptance.expectedFrameCount) errors.push('Gate D generated frame plan is incomplete');
  const manifestPath = `${root}/gate-d-manifest.json`;
  if (!existsSync(manifestPath)) errors.push('Gate D manifest missing');
  else {
    const value = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (value.screenCount !== 7 || value.frameCount !== 28 || value.sourceContract !== gateDPath || value.generatedArtifacts.length !== 50) errors.push('Gate D manifest summary drift');
  }
  if (!existsSync(`${root}/README.md`) || readFileSync(`${root}/README.md`, 'utf8').trim().length < 2000) errors.push('Gate D overview is missing or not substantive');
  if (!gateD.crossCutting.paymentRecovery.some((rule) => /unknown-result/.test(rule))) errors.push('Gate D unknown payment recovery is incomplete');
  if (!gateD.crossCutting.commerce.some((rule) => /15 دقیقه/.test(rule))) errors.push('Gate D checkout expiry boundary is incomplete');
}

function validateGateE() {
  if (gateE.step !== 55 || gateE.substep !== 'E' || gateE.status !== 'E_COMPLETE_STEP_IN_PROGRESS') errors.push('Gate E source status is invalid');
  if (gateE.baseline !== 'ae40460bed512bc8a492ffa101f4e6263cd7c4d3') errors.push('Gate E baseline drift');
  if (gateE.canonicalSource !== 'repository' || gateE.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Gate E authority is invalid');
  if (gateE.language !== 'fa-IR' || gateE.direction !== 'rtl' || gateE.currency !== 'Toman' || gateE.walletAllowed !== false || gateE.theme !== 'light') errors.push('Gate E foundation drift');
  if (JSON.stringify(gateE.acceptance.requiredWidths) !== JSON.stringify(contract.responsive.verificationWidthsPx)) errors.push('Gate E verification widths drift');
  if (gateE.acceptance.zoomPercent !== 400 || gateE.acceptance.minimumTargetPx !== 44) errors.push('Gate E accessibility thresholds drift');
  if (gateE.screens.length !== 12 || gateE.acceptance.screenCount !== 12 || gateE.acceptance.expectedFrameCount !== 48) errors.push('Gate E screen/frame count drift');
  const expectedE = contract.acceptanceGates.find((gate) => gate.id === '55-E').requiredScreens;
  if (JSON.stringify(gateE.screens.map((screen) => screen.id)) !== JSON.stringify(expectedE)) errors.push('Gate E screen inventory drift');
  if (JSON.stringify(gateE.journeys) !== JSON.stringify(['SJ-03','SJ-05','SJ-06','SJ-07','SJ-08','SJ-09','SJ-10','SJ-11','SJ-12'])) errors.push('Gate E journey set drift');
  const journeys = new Map(step53.journeys.map((journey) => [journey.id, journey]));
  const root = 'docs/13-product-design/step55-wireframes/E';
  let frameCount = 0;
  for (const screen of gateE.screens) {
    const frozen = contract.screenInventory.find((item) => item.id === screen.id);
    if (!frozen) { errors.push(`${screen.id}: not frozen upstream`); continue; }
    if (screen.routeIntent !== frozen.routeIntent) errors.push(`${screen.id}: route intent drift`);
    if (JSON.stringify(screen.journeys) !== JSON.stringify(frozen.journeys)) errors.push(`${screen.id}: journey drift`);
    if (JSON.stringify(screen.components) !== JSON.stringify(frozen.components)) errors.push(`${screen.id}: component drift`);
    if (JSON.stringify(screen.states.map((state) => state.id)) !== JSON.stringify(frozen.requiredStates)) errors.push(`${screen.id}: state drift`);
    const allowedOperations = new Set(screen.journeys.flatMap((id) => journeys.get(id)?.operations ?? []));
    for (const operation of screen.operations) if (!allowedOperations.has(operation)) errors.push(`${screen.id}: operation outside mapped journeys: ${operation}`);
    if (!screen.primaryTask || !screen.primaryAction || !screen.recoveryAction || screen.contentPriority.length < 4) errors.push(`${screen.id}: task/recovery/content priority incomplete`);
    const folder = `${root}/${screen.id}`;
    for (const companion of gateE.acceptance.requiredCompanions) {
      const path = `${folder}/${companion}`;
      if (!existsSync(path)) errors.push(`${screen.id}: missing ${companion}`);
      else if (readFileSync(path, 'utf8').trim().length < (companion === 'README.md' ? 1500 : 700)) errors.push(`${screen.id}: ${companion} is not substantive`);
    }
    const frames = screen.states.flatMap((state, index) => [{width:320,state:state.id}, ...(index === 0 ? [{width:1440,state:state.id}] : [])]);
    frameCount += frames.length;
    for (const frame of frames) {
      const filename = `${screen.id}--${frame.width}--${frame.state}--v${gateE.revision}.svg`, path = `${folder}/${filename}`;
      if (!existsSync(path)) { errors.push(`${screen.id}: missing frame ${filename}`); continue; }
      const svg = readFileSync(path, 'utf8');
      if (!svg.startsWith('<svg ') || !svg.includes('<title id="title">') || !svg.includes('<desc id="desc">')) errors.push(`${filename}: accessible SVG metadata missing`);
      if (!svg.includes(screen.id) || !svg.includes(frame.state) || !svg.includes(`${frame.width}px`)) errors.push(`${filename}: frame annotations incomplete`);
      if (/کیف پول|lorem ipsum|<image\b|data:image/i.test(svg)) errors.push(`${filename}: forbidden artifact content`);
    }
    if (existsSync(`${folder}/traceability.json`)) {
      const trace = JSON.parse(readFileSync(`${folder}/traceability.json`, 'utf8'));
      if (trace.screenId !== screen.id || trace.status !== 'COMPLETE' || trace.responsiveEvidence.length !== 6) errors.push(`${screen.id}: traceability invalid`);
      if (Object.values(trace.boundary).some(Boolean)) errors.push(`${screen.id}: boundary violation`);
      if (trace.zoomEvidence.horizontalTwoAxisScroll !== false) errors.push(`${screen.id}: zoom reflow is not bounded`);
    }
  }
  if (frameCount !== gateE.acceptance.expectedFrameCount) errors.push('Gate E generated frame plan is incomplete');
  const manifestPath = `${root}/gate-e-manifest.json`;
  if (!existsSync(manifestPath)) errors.push('Gate E manifest missing');
  else {
    const value = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (value.screenCount !== 12 || value.frameCount !== 48 || value.sourceContract !== gateEPath || value.generatedArtifacts.length !== 85) errors.push('Gate E manifest summary drift');
  }
  if (!existsSync(`${root}/README.md`) || readFileSync(`${root}/README.md`, 'utf8').trim().length < 3000) errors.push('Gate E overview is missing or not substantive');
  if (!gateE.crossCutting.ownershipPrivacy.some((rule) => /customer-owned/.test(rule))) errors.push('Gate E customer ownership boundary is incomplete');
  if (!gateE.crossCutting.wholesale.some((rule) => /approval authoritative/.test(rule))) errors.push('Gate E wholesale approval boundary is incomplete');
  if (!gateE.crossCutting.afterSales.some((rule) => /eligibility/.test(rule))) errors.push('Gate E after-sales eligibility boundary is incomplete');
}

function validateGateF() {
  if (gateF.step !== 55 || gateF.substep !== 'F' || !['F_COMPLETE_STEP_CLOSURE_CANDIDATE', 'CLOSED_FINAL_GATE_PASS'].includes(gateF.status)) errors.push('Gate F source status is invalid');
  if (gateF.baseline !== '9105a78af19e8a5f8fc30cc62a5dab94d208e46a') errors.push('Gate F baseline drift');
  if (gateF.canonicalSource !== 'repository' || gateF.figmaMirror !== 'OPTIONAL_NOT_REQUIRED') errors.push('Gate F authority is invalid');
  if (gateF.language !== 'fa-IR' || gateF.direction !== 'rtl' || gateF.currency !== 'Toman' || gateF.walletAllowed !== false || gateF.theme !== 'light') errors.push('Gate F foundation drift');
  if (JSON.stringify(gateF.acceptance.requiredWidths) !== JSON.stringify(contract.responsive.verificationWidthsPx)) errors.push('Gate F verification widths drift');
  if (gateF.acceptance.zoomPercent !== 400 || gateF.acceptance.minimumTargetPx !== 44) errors.push('Gate F accessibility thresholds drift');
  if (gateF.screens.length !== 7 || gateF.acceptance.screenCount !== 7 || gateF.acceptance.expectedFrameCount !== 25 || gateF.acceptance.expectedGeneratedChildren !== 49) errors.push('Gate F screen/frame/artifact count drift');
  const expectedF = contract.acceptanceGates.find((gate) => gate.id === '55-F').requiredScreens;
  if (JSON.stringify(gateF.screens.map((screen) => screen.id)) !== JSON.stringify(expectedF)) errors.push('Gate F screen inventory drift');
  if (JSON.stringify(gateF.journeys) !== JSON.stringify(['SJ-01','SJ-04','SJ-05','SJ-08','SJ-09','SJ-10','SJ-11'])) errors.push('Gate F journey set drift');

  const directOperations = new Set(gateF.directOpenApiCapabilities);
  const openapi = readFileSync('contracts/http/openapi.yaml', 'utf8');
  for (const operation of directOperations) {
    const [method, path] = operation.split(' ');
    if (method !== 'GET' || !openapi.includes(`  ${path}:`)) errors.push(`Gate F direct OpenAPI capability missing: ${operation}`);
  }

  const root = 'docs/13-product-design/step55-wireframes/F';
  let frameCount = 0;
  for (const screen of gateF.screens) {
    const frozen = contract.screenInventory.find((item) => item.id === screen.id);
    if (!frozen) { errors.push(`${screen.id}: not frozen upstream`); continue; }
    if (screen.routeIntent !== frozen.routeIntent) errors.push(`${screen.id}: route intent drift`);
    if (JSON.stringify(screen.journeys) !== JSON.stringify(frozen.journeys)) errors.push(`${screen.id}: journey drift`);
    if (JSON.stringify(screen.components) !== JSON.stringify(frozen.components)) errors.push(`${screen.id}: component drift`);
    if (JSON.stringify(screen.states.map((state) => state.id)) !== JSON.stringify(frozen.requiredStates)) errors.push(`${screen.id}: state drift`);
    if (!screen.primaryTask || !screen.primaryAction || !screen.recoveryAction || screen.contentPriority.length < 4) errors.push(`${screen.id}: task/recovery/content priority incomplete`);
    if (screen.operationTraceMode === 'openapi-direct-content-capability') {
      if (!screen.operations.length || screen.operations.some((operation) => !directOperations.has(operation))) errors.push(`${screen.id}: direct content capability trace is invalid`);
    } else if (screen.operations.length || !['static-approved-content', 'static-approved-policy', 'no-approved-public-mutation'].includes(screen.operationTraceMode)) {
      errors.push(`${screen.id}: static/support screen invents an operation or trace mode`);
    }

    const folder = `${root}/${screen.id}`;
    for (const companion of gateF.acceptance.requiredCompanions) {
      const path = `${folder}/${companion}`;
      if (!existsSync(path)) errors.push(`${screen.id}: missing ${companion}`);
      else if (readFileSync(path, 'utf8').trim().length < (companion === 'README.md' ? 1500 : 700)) errors.push(`${screen.id}: ${companion} is not substantive`);
    }
    const frames = screen.states.flatMap((state, index) => [{width:320,state:state.id}, ...(index === 0 ? [{width:1440,state:state.id}] : [])]);
    frameCount += frames.length;
    for (const frame of frames) {
      const filename = `${screen.id}--${frame.width}--${frame.state}--v${gateF.revision}.svg`, path = `${folder}/${filename}`;
      if (!existsSync(path)) { errors.push(`${screen.id}: missing frame ${filename}`); continue; }
      const svg = readFileSync(path, 'utf8');
      if (!svg.startsWith('<svg ') || !svg.includes('<title id="title">') || !svg.includes('<desc id="desc">')) errors.push(`${filename}: accessible SVG metadata missing`);
      if (!svg.includes(screen.id) || !svg.includes(frame.state) || !svg.includes(`${frame.width}px`)) errors.push(`${filename}: frame annotations incomplete`);
      if (/کیف پول|lorem ipsum|\bBrown\b|<image\b|data:image/i.test(svg)) errors.push(`${filename}: forbidden artifact content`);
    }
    if (existsSync(`${folder}/traceability.json`)) {
      const trace = JSON.parse(readFileSync(`${folder}/traceability.json`, 'utf8'));
      if (trace.screenId !== screen.id || trace.status !== 'COMPLETE' || trace.responsiveEvidence.length !== 6) errors.push(`${screen.id}: traceability invalid`);
      if (Object.values(trace.boundary).some(Boolean)) errors.push(`${screen.id}: boundary violation`);
      if (trace.zoomEvidence.percent !== 400 || trace.zoomEvidence.horizontalTwoAxisScroll !== false) errors.push(`${screen.id}: zoom reflow is not bounded`);
    }
  }
  if (frameCount !== 25) errors.push('Gate F generated frame plan is incomplete');

  const manifestPath = `${root}/gate-f-manifest.json`;
  if (!existsSync(manifestPath)) errors.push('Gate F manifest missing');
  else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const sourceHash = createHash('sha256').update(readFileSync(gateFPath, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
    if (manifest.screenCount !== 7 || manifest.frameCount !== 25 || manifest.sourceContract !== gateFPath || manifest.sourceSha256 !== sourceHash || manifest.generatedArtifacts.length !== 49) errors.push('Gate F manifest summary/hash drift');
    for (const artifact of manifest.generatedArtifacts) {
      if (!existsSync(artifact.path)) { errors.push(`Gate F manifest child missing: ${artifact.path}`); continue; }
      const digest = createHash('sha256').update(readFileSync(artifact.path, 'utf8')).digest('hex');
      if (digest !== artifact.sha256) errors.push(`Gate F manifest child hash drift: ${artifact.path}`);
    }
  }
  if (!existsSync(`${root}/README.md`) || readFileSync(`${root}/README.md`, 'utf8').trim().length < 3000) errors.push('Gate F overview is missing or not substantive');
  for (const key of ['contentTruth', 'policySafety', 'supportPrivacy', 'accessibility', 'finalAudit']) if ((gateF.crossCutting[key] ?? []).length < 4) errors.push(`Gate F ${key} contract is incomplete`);

  const auditPath = `${root}/storefront-final-audit.json`;
  if (!existsSync(auditPath)) errors.push('Step 55 final audit missing');
  else {
    const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
    if (audit.gateCount !== 5 || audit.screenCount !== 37 || audit.frameCount !== 145 || audit.manifestCount !== 5 || audit.generatedArtifactCountIncludingManifests !== 268 || audit.journeyCount !== 12) errors.push('Step 55 final audit totals drift');
    if (new Set(audit.screens.map((screen) => screen.id)).size !== 37 || audit.screens.some((screen) => screen.verdict !== 'PASS')) errors.push('Step 55 final audit screen verdict drift');
    if (audit.openExceptions.length || audit.checks.length !== gateF.audit.requiredChecks.length || audit.checks.some((check) => check.verdict !== 'PASS') || Object.values(audit.boundary).some(Boolean)) errors.push('Step 55 final audit has an exception or failed boundary');
  }
  if (!existsSync(`${root}/STOREFRONT-FINAL-AUDIT.md`) || readFileSync(`${root}/STOREFRONT-FINAL-AUDIT.md`, 'utf8').trim().length < 1500) errors.push('Step 55 final audit narrative is missing or not substantive');
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
