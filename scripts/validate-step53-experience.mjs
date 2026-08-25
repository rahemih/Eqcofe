import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const contractFile = 'docs/13-product-design/step53-experience-contract.json';
const requiredDocs = [
  'docs/13-product-design/README.md',
  'docs/13-product-design/STEP-53-INFORMATION-ARCHITECTURE.md',
  'docs/13-product-design/STEP-53-USER-JOURNEYS.md',
  'docs/13-product-design/STEP-53-ADMIN-EXPERIENCE.md',
  'docs/13-product-design/STEP-53-STATE-AND-TRACEABILITY.md'
];

const contract = JSON.parse(readFileSync(contractFile, 'utf8'));
const openapi = loadOpenApi();
const errors = [];

if (contract.step !== 53) errors.push('contract.step must be 53');
if (contract.language !== 'fa-IR' || contract.direction !== 'rtl') {
  errors.push('Step 53 must remain Persian-first RTL');
}

for (const file of requiredDocs) {
  const text = readFileSync(file, 'utf8');
  if (text.trim().length < 500) errors.push(`${file}: expected a substantive Step-53 artifact`);
}

const actorIds = uniqueIds(contract.actors, 'actors', errors);
uniqueIds(contract.storefrontNavigation, 'storefrontNavigation', errors);
uniqueIds(contract.adminNavigation, 'adminNavigation', errors);
const journeyIds = uniqueIds(contract.journeys, 'journeys', errors);

const requiredAreas = new Set(contract.requiredAreas ?? []);
for (const area of [
  'storefront-navigation',
  'retail',
  'checkout',
  'payment-recovery',
  'account',
  'after-sales',
  'wholesale',
  'admin-navigation',
  'admin-operations',
  'permissions',
  'state-visibility',
  'accessibility-handoff'
]) {
  if (!requiredAreas.has(area)) errors.push(`requiredAreas: missing ${area}`);
}

const customerJourneys = contract.journeys.filter((journey) => journey.id.startsWith('SJ-'));
const adminJourneys = contract.journeys.filter((journey) => journey.id.startsWith('AJ-'));
if (customerJourneys.length < 12) errors.push('At least 12 storefront/customer journeys are required');
if (adminJourneys.length < 12) errors.push('At least 12 admin journeys are required');

for (const journey of contract.journeys) {
  for (const field of ['id', 'area', 'title', 'entry', 'success']) {
    if (!journey[field]) errors.push(`${journey.id ?? 'unknown'}: missing ${field}`);
  }
  if (!Array.isArray(journey.actors) || journey.actors.length === 0) {
    errors.push(`${journey.id}: at least one actor is required`);
  }
  for (const actor of journey.actors ?? []) {
    if (!actorIds.has(actor)) errors.push(`${journey.id}: unknown actor ${actor}`);
  }
  if (!Array.isArray(journey.states) || journey.states.length < 3) {
    errors.push(`${journey.id}: at least three visible states are required`);
  }
  if (!Array.isArray(journey.operations) || journey.operations.length === 0) {
    errors.push(`${journey.id}: at least one OpenAPI operation is required`);
  }
  for (const reference of journey.operations ?? []) {
    const match = /^(GET|POST|PUT|PATCH|DELETE) (\/.+)$/.exec(reference);
    if (!match) {
      errors.push(`${journey.id}: invalid operation reference ${reference}`);
      continue;
    }
    const [, method, path] = match;
    if (!openapi.paths?.[path]?.[method.toLowerCase()]) {
      errors.push(`${journey.id}: missing OpenAPI operation ${reference}`);
    }
  }
}

const tracedJourneyIds = new Set();
for (const trace of contract.businessRuleTraceability ?? []) {
  if (!trace.rule || !Array.isArray(trace.journeys) || trace.journeys.length === 0) {
    errors.push('businessRuleTraceability: every rule needs mapped journeys');
    continue;
  }
  for (const journeyId of trace.journeys) {
    tracedJourneyIds.add(journeyId);
    if (!journeyIds.has(journeyId)) errors.push(`businessRuleTraceability: unknown journey ${journeyId}`);
  }
}

for (const required of ['SJ-02', 'SJ-04', 'SJ-05', 'SJ-06', 'SJ-08', 'SJ-09', 'SJ-10', 'SJ-11', 'AJ-02', 'AJ-05', 'AJ-07', 'AJ-10', 'AJ-11', 'AJ-12']) {
  if (!tracedJourneyIds.has(required)) errors.push(`businessRuleTraceability: critical journey ${required} is untraced`);
}

if ((contract.crossCuttingStates ?? []).length < 12) errors.push('crossCuttingStates: incomplete state vocabulary');
if ((contract.accessibilityHandoff ?? []).length < 8) errors.push('accessibilityHandoff: incomplete design-system handoff');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  step: contract.step,
  actors: contract.actors.length,
  storefront_navigation_items: contract.storefrontNavigation.length,
  admin_navigation_groups: contract.adminNavigation.length,
  customer_journeys: customerJourneys.length,
  admin_journeys: adminJourneys.length,
  operation_references: contract.journeys.reduce((total, journey) => total + journey.operations.length, 0),
  business_rule_traces: contract.businessRuleTraceability.length
}, null, 2));

function uniqueIds(items, label, validationErrors) {
  const ids = new Set();
  for (const item of items ?? []) {
    if (!item?.id) {
      validationErrors.push(`${label}: missing id`);
      continue;
    }
    if (ids.has(item.id)) validationErrors.push(`${label}: duplicate id ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function loadOpenApi() {
  const doc = parse(readFileSync('contracts/http/openapi.yaml', 'utf8'));
  for (const file of readdirSync('contracts/http').filter((name) => /^openapi-.+\.yaml$/.test(name)).sort()) {
    const overlay = parse(readFileSync(`contracts/http/${file}`, 'utf8'));
    for (const [path, item] of Object.entries(overlay.paths ?? {})) {
      if (doc.paths?.[path]) throw new Error(`Duplicate OpenAPI path from ${file}: ${path}`);
      doc.paths ??= {};
      doc.paths[path] = item;
    }
  }
  return doc;
}
