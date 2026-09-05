import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { adminEvidence, readJson } from './step56-admin-sources.mjs';

const path = 'docs/13-product-design/step56-admin-ux-contract.json';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (a) => [...new Set(a)].sort();
const sourceEvidence = adminEvidence();
const s53 = readJson('docs/13-product-design/step53-experience-contract.json');
const s54 = readJson('docs/13-product-design/step54-design-system-contract.json');
export function validateContract(c) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(c.step === 56 && c.substep === 'A' && c.status === 'FOUNDATION_CANDIDATE_BLOCKED', 'Gate status must remain an honest blocked A candidate');
  check(c.nextGate === '56-B' && c.nextGateStatus === 'NOT_STARTED' && c.pageWireframes.length === 0, '56-B or page wireframes started');
  check(Object.values(c.boundary).every((v) => v === false), 'Out-of-scope authority enabled');
  check(c.canonicalSource === 'repository' && c.figmaMirror === 'OPTIONAL_NOT_REQUIRED', 'Canonical/Figma authority drift');
  check(same(c.foundation, s54.foundation) && same(c.typography, s54.typography) && same(c.accessibility, s54.accessibility), 'Step 54 foundation drift');
  for (const key of Object.keys(s54.responsive)) check(same(c.responsive[key], s54.responsive[key]), `Step 54 responsive drift: ${key}`);
  check(same(c.responsive.verificationWidthsPx, [320, 360, 600, 840, 1200, 1440]) && c.responsive.zoomPercent === 400, 'Responsive acceptance incomplete');
  check(same(c.journeys, s53.journeys.filter((j) => j.id.startsWith('AJ-'))), 'Inherited admin journeys changed');
  check(same(c.actors, s53.actors.filter((a) => ['staff', 'approver', 'operator'].includes(a.id))) && c.roleBoundary.kind === 'EXPERIENCE_PERSONAS_NOT_RBAC_ROLES', 'Persona/role boundary drift');
  check(same(c.adminNavigation, s53.adminNavigation), 'Step 53 navigation drift');
  for (const key of ['screenInventory', 'tasks', 'actors', 'domains', 'journeys', 'acceptanceGates', 'blockers']) check(new Set(c[key].map((x) => x.id)).size === c[key].length, `Duplicate IDs: ${key}`);
  const states = new Set([...Object.values(c.stateTaxonomy).flat(), ...c.journeys.flatMap((j) => j.states)]);
  for (const required of ['initial-loading', 'empty-first-use', 'server-error', 'authoritative-success', 'disabled', 'permission-denied', 'safe-retry', 'version-conflict', 'stale-data', 'destructive-action-confirmation']) check(states.has(required), `Missing global state ${required}`);
  check(same(c.operationEvidence.map((e) => e.key), sourceEvidence.map((e) => e.key)), 'Operation coverage differs from OpenAPI/controller union');
  for (const source of sourceEvidence) {
    const e = c.operationEvidence.find((x) => x.key === source.key);
    if (!e) continue;
    check(same(e.openapi, source.openapi) && same(e.runtime, source.runtime) && same(e.supplemental, source.supplemental), `Source evidence drift: ${source.key}`);
    const permissions = source.runtime?.permissions ?? (source.openapi?.extensions.permission ? [source.openapi.extensions.permission] : []);
    check(same(e.permissions, permissions), `Invented/changed permission: ${source.key}`);
    check(e.authority === (source.runtime ? (source.openapi ? 'OPENAPI_AND_CONTROLLER' : 'RUNTIME_OUTSIDE_ASSEMBLED_OPENAPI') : 'CONTRACT_ONLY_NO_CONTROLLER'), `False runtime authority: ${source.key}`);
    const expectedPermissionStatus = permissions.length ? 'SOURCE_EXPLICIT' : source.runtime ? (source.runtime.public ? 'PREAUTH_CHALLENGE_BOUNDARY' : 'STAFF_SELF_SESSION') : 'UNRESOLVED_NOT_GRANTED';
    check(e.permissionStatus === expectedPermissionStatus, `False permission status: ${source.key}`);
    const owners = c.screenInventory.filter((s) => s.operations.includes(e.key));
    check(owners.length === 1 && owners[0].id === e.screen, `Operation must have one surface owner: ${e.key}`);
    if (!source.runtime) check(e.designDisposition === 'QUARANTINED_CONCEPT_ONLY', `Unsupported action must be quarantined: ${e.key}`);
  }
  const journeyIds = new Set(c.journeys.map((j) => j.id));
  const allJourneys = new Set();
  for (const s of c.screenInventory) {
    check(/^AD-[B-G]-\d{2}$/.test(s.id) && s.gate === `56-${s.id[3]}`, `Invalid screen/gate ${s.id}`);
    check(s.title.length > 3 && s.requiredFacets.length >= 5 && s.permissionBoundary.includes('never an all-or-any'), `Incomplete surface ${s.id}`);
    check(s.operations.length > 0 || Boolean(s.noApiReason), `Missing no-API reason ${s.id}`);
    for (const j of s.journeys) { check(journeyIds.has(j), `Unknown journey ${j}`); allJourneys.add(j); }
    for (const d of s.domains) check(c.domains.some((x) => x.id === d), `Unknown domain ${d}`);
    for (const a of s.actors) check(c.actors.some((x) => x.id === a), `Unknown actor ${a}`);
    for (const state of s.requiredStates) check(states.has(state), `Unknown state ${state}`);
    for (const family of Object.values(c.stateTaxonomy)) check(family.every((state) => s.requiredStates.includes(state)), `Incomplete global states ${s.id}`);
    for (const component of s.components) check(Boolean(s54.components[component]), `Unknown component ${component}`);
    const task = c.tasks.find((t) => t.id === s.task);
    check(task?.screen === s.id && same(task?.operations, s.operations) && same(task?.journeys, s.journeys) && task?.steps.length === 6, `Task trace mismatch ${s.id}`);
    const ops = c.operationEvidence.filter((e) => s.operations.includes(e.key));
    check(same(s.permissions, sorted(ops.flatMap((e) => e.permissions))), `Surface permissions drift ${s.id}`);
    check(same(s.blockedOperations, ops.filter((e) => e.permissionStatus === 'UNRESOLVED_NOT_GRANTED' || e.authority !== 'OPENAPI_AND_CONTROLLER').map((e) => e.key)), `Surface blocker coverage drift ${s.id}`);
  }
  check(allJourneys.size === 12, 'All 12 admin journeys must be mapped');
  check(same(c.acceptanceGates.map((g) => g.id), ['56-B', '56-C', '56-D', '56-E', '56-F', '56-G', '56-H']), 'Later gate inventory drift');
  for (const g of c.acceptanceGates) {
    check(g.status === 'NOT_STARTED', `Later gate started ${g.id}`);
    check(same(g.requiredScreens, c.screenInventory.filter((s) => s.gate === g.id).map((s) => s.id)), `Gate ownership drift ${g.id}`);
    check(g.requirements.length >= 4, `Acceptance missing ${g.id}`);
  }
  const gaps = [sourceEvidence.filter((e) => !e.runtime), sourceEvidence.filter((e) => !e.runtime && !e.openapi.extensions.permission), sourceEvidence.filter((e) => !e.openapi)];
  check(c.blockers.length === 3, 'Source gaps may not be silently waived');
  gaps.forEach((gap, i) => check(same(c.blockers.find((b) => b.id === `GAP-0${i + 1}`)?.operations, gap.map((e) => e.key)), `Gap evidence incomplete GAP-0${i + 1}`));
  const expected = { actors: 3, inheritedAdminJourneys: 12, tasks: 97, surfaceObligations: 97, backendModules: 28, assembledAdminOpenapiOperations: 507, adminRuntimeRoutes: 376, unionOperations: 532, explicitPermissionKeys: 118, unresolvedPermissionOperations: 151, screenJourneyLinks: 111 };
  check(same(c.counts, expected), 'Frozen counts changed');
  check(c.screenInventory.length === 97 && c.tasks.length === 97 && c.domains.length === 28 && sorted(c.operationEvidence.flatMap((e) => e.permissions)).length === 118, 'Actual counts disagree');
  for (const source of c.sources) {
    check(existsSync(source.path), `Missing recovered source ${source.path}`);
    if (!existsSync(source.path)) continue;
    const hash = createHash('sha256').update(readFileSync(source.path, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
    check(hash === source.sha256, `Recovered source changed: ${source.path}`);
  }
  for (const d of c.domains) check(existsSync(d.source), `Missing module source ${d.id}`);
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = readJson(path);
  const errors = validateContract(c);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(JSON.stringify({ structuralValidation: 'PASS', finalGate: 'BLOCKED', counts: c.counts, blockers: c.blockers.map((b) => ({ id: b.id, operations: b.operations.length })), nextGate: '56-B NOT_STARTED' }, null, 2));
  if (process.argv.includes('--require-ready')) { console.error('56-A FINAL GATE BLOCKED: canonical source and permission gaps require resolution; merge forbidden.'); process.exit(2); }
}
