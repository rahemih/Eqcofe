import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { adminEvidence, filesUnder, readJson } from './step56-admin-sources.mjs';

const path = 'docs/13-product-design/step56-admin-ux-contract.json';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (a) => [...new Set(a)].sort();
const sourceEvidence = adminEvidence();
const s53 = readJson('docs/13-product-design/step53-experience-contract.json');
const s54 = readJson('docs/13-product-design/step54-design-system-contract.json');
const migrationSources = filesUnder('database/migrations').filter((p) => p.endsWith('.sql')).map((path) => ({ path, text: readFileSync(path, 'utf8') }));
const baseline = '8e7eb050785fb7d284e33398045372162998e33d';
const statePaths = ['docs/12-current-state/MASTER-ROADMAP.md', 'docs/12-current-state/CURRENT-STATE.md', 'docs/12-current-state/CHAT-HANDOFF.md'];
const requiredSourcePaths = sorted([...statePaths, 'docs/01-product-vision/EQCOFE-PRODUCT-VISION.md', 'docs/02-business-rules/EQCOFE-BUSINESS-RULES.md', ...filesUnder('docs/13-product-design').filter((f) => /STEP-5[345]|step5[345].*json$|generated\//.test(f) && !f.includes('step55-wireframes/')), ...filesUnder('docs/11-step-history').filter((f) => /STEP-5[345]/.test(f)), ...filesUnder('contracts/http'), ...filesUnder('src/platform/auth'), ...filesUnder('src/modules').filter((f) => f.endsWith('.module.ts') || f.endsWith('.controller.ts')), 'src/modules/admin/application/rbac.service.ts', 'src/modules/admin/infrastructure/rbac.repository.ts', 'src/modules/identity/infrastructure/session-actor-resolver.ts', 'scripts/validate-openapi.mjs', '.github/workflows/ci.yml', ...migrationSources.filter((m) => sourceEvidence.some((e) => (e.runtime?.permissions ?? (e.openapi?.extensions.permission ? [e.openapi.extensions.permission] : [])).some((p) => m.text.includes(`'${p}'`)))).map((m) => m.path)]);
export function validateContract(c) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(c.step === 56 && c.substep === 'A' && c.status === 'A_COMPLETE_STEP_IN_PROGRESS', 'Gate status must identify only the completed A foundation');
  check(same(c.completedGates, ['56-A']) && c.foundationAcceptance?.scope === 'DESIGN_FOUNDATION_ONLY' && c.foundationAcceptance.allObligationsRetained === true && c.foundationAcceptance.runtimeReadinessCertified === false, 'Foundation acceptance must not remove scope or certify runtime readiness');
  check(c.baseline === baseline && same(c.startingPosition, { step55: 'CLOSED_FINAL_GATE_PASS', activeStep: 'NONE', nextStep: 56 }), 'Canonical baseline/handoff identity drift');
  check(same(c.handoffEvidence, { step55Pr: 151, exactHead: '842703ba37546ad553bfa0bb876ba04c7694434f', exactHeadCi: 33949227612, merge: 'b5891d4e901814fbb3d1ea1cb17f0073232644e1', postMergeCi: 33949283677 }), 'Step 55 closure evidence drift');
  check(c.nextGate === '56-B' && c.nextGateStatus === 'NOT_STARTED' && c.pageWireframes.length === 0, '56-B or page wireframes started');
  check(Object.values(c.boundary).every((v) => v === false), 'Out-of-scope authority enabled');
  check(c.canonicalSource === 'repository' && c.figmaMirror === 'OPTIONAL_NOT_REQUIRED', 'Canonical/Figma authority drift');
  check(same(c.foundation, s54.foundation) && same(c.typography, s54.typography) && same(c.accessibility, s54.accessibility), 'Step 54 foundation drift');
  for (const key of Object.keys(s54.responsive)) check(same(c.responsive[key], s54.responsive[key]), `Step 54 responsive drift: ${key}`);
  check(same(c.responsive.verificationWidthsPx, [320, 360, 600, 840, 1200, 1440]) && c.responsive.zoomPercent === 400, 'Responsive acceptance incomplete');
  check(same(c.journeys, s53.journeys.filter((j) => j.id.startsWith('AJ-'))), 'Inherited admin journeys changed');
  check(same(c.actors, s53.actors.filter((a) => ['staff', 'approver', 'operator'].includes(a.id))) && c.roleBoundary.kind === 'EXPERIENCE_PERSONAS_NOT_RBAC_ROLES', 'Persona/role boundary drift');
  check(same(c.roleBoundary.assignableScopeTypes, ['warehouse', 'physical_store']) && c.roleBoundary.scopeTypeSource === 'src/modules/admin/application/rbac.service.ts#setScopes', 'Assignable scope boundary drift');
  check(same(c.adminNavigation, s53.adminNavigation), 'Step 53 navigation drift');
  for (const key of ['screenInventory', 'tasks', 'actors', 'domains', 'journeys', 'acceptanceGates', 'sourceGaps']) check(new Set(c[key].map((x) => x.id)).size === c[key].length, `Duplicate IDs: ${key}`);
  const states = new Set([...Object.values(c.stateTaxonomy).flat(), ...c.journeys.flatMap((j) => j.states)]);
  for (const required of ['initial-loading', 'empty-first-use', 'server-error', 'authoritative-success', 'disabled', 'permission-denied', 'safe-retry', 'version-conflict', 'stale-data', 'destructive-action-confirmation']) check(states.has(required), `Missing global state ${required}`);
  check(same(c.operationEvidence.map((e) => e.key), sourceEvidence.map((e) => e.key)), 'Operation coverage differs from OpenAPI/controller union');
  for (const source of sourceEvidence) {
    const e = c.operationEvidence.find((x) => x.key === source.key);
    if (!e) continue;
    check(same(e.openapi, source.openapi) && same(e.runtime, source.runtime) && same(e.supplemental, source.supplemental), `Source evidence drift: ${source.key}`);
    const permissions = source.runtime?.permissions ?? (source.openapi?.extensions.permission ? [source.openapi.extensions.permission] : []);
    check(same(e.permissions, permissions), `Invented/changed permission: ${source.key}`);
    const permissionSources = Object.fromEntries(permissions.map((p) => [p, migrationSources.filter((m) => m.text.includes(`'${p}'`)).map((m) => m.path)]));
    check(same(e.permissionSources, permissionSources), `Permission provenance drift: ${source.key}`);
    const stepUp = source.runtime ? (source.runtime.stepUp ? 'DECORATOR_REQUIRED' : 'NO_DECORATOR_CHECK_DOMAIN_POLICY') : 'UNVERIFIED_NO_CONTROLLER';
    check(e.stepUp === stepUp, `Step-Up evidence drift: ${source.key}`);
    check(same(e.audit, source.openapi?.extensions.audit ?? 'CHECK_OWNER_SERVICE_NOT_INFERRED'), `Audit evidence drift: ${source.key}`);
    if (source.runtime) check(e.domain === source.runtime.module, `Runtime domain ownership drift: ${source.key}`);
    check(e.authority === (source.runtime ? (source.openapi ? 'OPENAPI_AND_CONTROLLER' : 'RUNTIME_OUTSIDE_ASSEMBLED_OPENAPI') : 'CONTRACT_ONLY_NO_CONTROLLER'), `False runtime authority: ${source.key}`);
    const conflict = Boolean(source.runtime && source.openapi?.extensions.permission && !source.runtime.permissions.includes(source.openapi.extensions.permission));
    check(same(e.permissionClaims, { runtime: source.runtime?.permissions ?? null, openapi: source.openapi?.extensions.permission ?? null }), `Permission claims lost: ${source.key}`);
    check(e.permissionConflict === conflict, `Permission conflict classification drift: ${source.key}`);
    const executionAuthority = !source.openapi || !source.runtime || conflict ? 'NO_ACTION_UNTIL_CANONICAL_RECONCILIATION' : 'SUBJECT_TO_EXISTING_SERVER_PERMISSION_SCOPE_AND_OWNER_POLICY';
    check(e.executionAuthority === executionAuthority, `Execution authority drift: ${source.key}`);
    if (conflict) check(e.designDisposition === 'PERMISSION_CONFLICT_NO_ACTION', `Permission conflict must forbid action: ${source.key}`);
    const expectedPermissionStatus = conflict ? 'CONFLICT_UNRESOLVED_NOT_GRANTED' : permissions.length ? 'SOURCE_EXPLICIT' : source.runtime ? (source.runtime.public ? 'PREAUTH_CHALLENGE_BOUNDARY' : 'STAFF_SELF_SESSION') : 'UNRESOLVED_NOT_GRANTED';
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
    for (const state of c.journeys.filter((j) => s.journeys.includes(j.id)).flatMap((j) => j.states)) check(s.requiredStates.includes(state), `Missing inherited lifecycle state ${s.id}: ${state}`);
    const expectedActors = s.gate === '56-B' ? sorted(c.actors.map((a) => a.id)) : sorted(c.journeys.filter((j) => s.journeys.includes(j.id)).flatMap((j) => j.actors));
    check(same(s.actors, expectedActors), `Surface actor coverage drift ${s.id}`);
    for (const component of s.components) check(Boolean(s54.components[component]), `Unknown component ${component}`);
    const task = c.tasks.find((t) => t.id === s.task);
    check(task?.screen === s.id && same(task?.operations, s.operations) && same(task?.journeys, s.journeys) && task?.steps.length === 6, `Task trace mismatch ${s.id}`);
    check(same(task?.actors, s.actors), `Task actor coverage drift ${s.id}`);
    const ops = c.operationEvidence.filter((e) => s.operations.includes(e.key));
    check(same(s.domains, ops.length ? sorted(ops.map((e) => e.domain)) : ['admin']), `Surface domain ownership drift ${s.id}`);
    check(same(s.permissions, sorted(ops.flatMap((e) => e.permissions))), `Surface permissions drift ${s.id}`);
    check(same(s.blockedOperations, ops.filter((e) => e.permissionConflict || e.permissionStatus === 'UNRESOLVED_NOT_GRANTED' || e.authority !== 'OPENAPI_AND_CONTROLLER').map((e) => e.key)), `Surface blocker coverage drift ${s.id}`);
  }
  check(allJourneys.size === 12, 'All 12 admin journeys must be mapped');
  check(same(c.acceptanceGates.map((g) => g.id), ['56-B', '56-C', '56-D', '56-E', '56-F', '56-G', '56-H']), 'Later gate inventory drift');
  for (const g of c.acceptanceGates) {
    check(g.status === 'NOT_STARTED', `Later gate started ${g.id}`);
    const owned = g.id === '56-H' ? c.screenInventory : c.screenInventory.filter((s) => s.gate === g.id);
    check(same(g.requiredScreens, owned.map((s) => s.id)), `Gate ownership drift ${g.id}`);
    check(same(g.requiredJourneys, sorted(owned.flatMap((s) => s.journeys))), `Gate journey coverage drift ${g.id}`);
    if (g.id === '56-H') check(g.auditOnly === true, 'H must audit the full union without owning new frames');
    check(g.executionRestrictionsMustRemain === true, `Later gate cannot waive execution restrictions ${g.id}`);
    check(g.requirements.length >= 4, `Acceptance missing ${g.id}`);
  }
  const gaps = [sourceEvidence.filter((e) => !e.runtime), sourceEvidence.filter((e) => !e.runtime && !e.openapi.extensions.permission), sourceEvidence.filter((e) => !e.openapi), sourceEvidence.filter((e) => e.runtime && e.openapi?.extensions.permission && !e.runtime.permissions.includes(e.openapi.extensions.permission))];
  check(c.sourceGaps.length === 4, 'Source gaps may not be silently waived');
  gaps.forEach((gap, i) => check(same(c.sourceGaps.find((b) => b.id === `GAP-0${i + 1}`)?.operations, gap.map((e) => e.key)), `Gap evidence incomplete GAP-0${i + 1}`));
  for (const gap of c.sourceGaps) {
    check(gap.severity === 'IMPLEMENTATION_RELEASE_BLOCKER' && gap.foundationDisposition?.status === 'RETAINED_DESIGN_OBLIGATION_NO_ACTION' && gap.foundationDisposition.scopeRemoved === false && gap.foundationDisposition.designAuditGate === '56-H', `Source gap cannot be waived ${gap.id}`);
    check(Boolean(gap.foundationDisposition?.executionReleasePrerequisite) && Boolean(gap.foundationDisposition?.prohibited), `Missing release prerequisite ${gap.id}`);
    check(same(gap.affectedScreens, c.screenInventory.filter((s) => s.operations.some((k) => gap.operations.includes(k))).map((s) => s.id)), `Gap surface coverage drift ${gap.id}`);
    check(same(gap.responsibleDomains, sorted(c.operationEvidence.filter((e) => gap.operations.includes(e.key)).map((e) => e.domain))), `Gap owner coverage drift ${gap.id}`);
  }
  const expected = { actors: 3, inheritedAdminJourneys: 12, tasks: 97, surfaceObligations: 97, backendModules: 28, assembledAdminOpenapiOperations: 507, adminRuntimeRoutes: 376, unionOperations: 532, explicitPermissionKeys: 118, unresolvedPermissionOperations: 151, screenJourneyLinks: 111, runtimePermissionKeys: 114, allSourcePermissionKeys: 122, permissionConflictOperations: 5 };
  check(same(c.counts, expected), 'Frozen counts changed');
  check(c.screenInventory.length === 97 && c.tasks.length === 97 && c.domains.length === 28 && sorted(c.operationEvidence.flatMap((e) => e.permissions)).length === 118, 'Actual counts disagree');
  check(c.operationEvidence.filter((e) => e.openapi).length === c.counts.assembledAdminOpenapiOperations && c.operationEvidence.filter((e) => e.runtime).length === c.counts.adminRuntimeRoutes && c.operationEvidence.length === c.counts.unionOperations, 'Actual source counts disagree');
  check(c.screenInventory.reduce((n, s) => n + s.journeys.length, 0) === c.counts.screenJourneyLinks, 'Actual journey-link count disagrees');
  check(c.sources.length === requiredSourcePaths.length && same(sorted(c.sources.map((s) => s.path)), requiredSourcePaths), 'Required source inventory incomplete');
  check(c.baselineSnapshot === 'docs/13-product-design/step56-baseline-canonical-state.json', 'Baseline snapshot pointer drift');
  const snapshot = readJson('docs/13-product-design/step56-baseline-canonical-state.json');
  check(snapshot.baseline === baseline && same(snapshot.files.map((s) => s.path), statePaths), 'Baseline snapshot identity drift');
  check(createHash('sha256').update(readFileSync('docs/13-product-design/step56-baseline-canonical-state.json', 'utf8').replaceAll('\r\n', '\n')).digest('hex') === c.baselineSnapshotSha256, 'Baseline snapshot content drift');
  for (const source of c.sources) {
    check(existsSync(source.path), `Missing recovered source ${source.path}`);
    if (!existsSync(source.path)) continue;
    const historical = statePaths.includes(source.path);
    const snap = snapshot.files.find((s) => s.path === source.path);
    if (historical) check(source.verification === 'BASELINE_SNAPSHOT' && snap?.sha256 === source.sha256, `Baseline/current evidence conflated: ${source.path}`);
    const content = historical ? snap?.content ?? '' : readFileSync(source.path, 'utf8');
    const hash = createHash('sha256').update(content.replaceAll('\r\n', '\n')).digest('hex');
    check(hash === source.sha256, `Recovered source changed: ${source.path}`);
  }
  for (const d of c.domains) {
    check(existsSync(d.source), `Missing module source ${d.id}`);
    check(same(d.screens, c.screenInventory.filter((s) => s.domains.includes(d.id)).map((s) => s.id)), `Reverse domain coverage drift ${d.id}`);
  }
  check(same(c.shellAuthorityDependency?.operations, sourceEvidence.map((e) => e.key)), 'B shell authority must cover all operation dependencies');
  const auth = c.tasks.find((t) => t.id === 'AT-B-01');
  check(auth?.entry.includes('Direct preauthentication'), 'Authentication entry must not require a pre-existing session');
  for (const [id, isPublic] of [['preauthentication', true], ['authenticated-security', false]]) {
    const actual = auth?.variants?.find((v) => v.id === id);
    const expected = sourceEvidence.filter((e) => c.operationEvidence.find((x) => x.key === e.key)?.screen === 'AD-B-01' && Boolean(e.runtime?.public) === isPublic).map((e) => e.key);
    check(actual?.steps.length === 3 && same(actual?.operations, expected), `Authentication variant coverage drift ${id}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = readJson(path);
  const errors = validateContract(c);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(JSON.stringify({ structuralValidation: 'PASS', foundationGate: 'PASS', runtimeRelease: 'BLOCKED_BY_OPEN_IMPLEMENTATION_EVIDENCE', counts: c.counts, blockers: c.sourceGaps.map((b) => ({ id: b.id, operations: b.operations.length })), nextGate: '56-B NOT_STARTED' }, null, 2));
  if (process.argv.includes('--require-ready')) console.log('56-A FOUNDATION READY: exact-head CI, merge and post-merge verification remain mandatory; runtime release is not certified.');
}
