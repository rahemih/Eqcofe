import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const root='docs/13-product-design';
export const names=['admin-shell','catalog-media','pricing-inventory','commerce-operations','customers-growth','management-security'];
export const read=p=>JSON.parse(readFileSync(p,'utf8'));
export const normalized=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
export const hash=t=>createHash('sha256').update(t).digest('hex');
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=a=>[...a].sort();
const unique=a=>[...new Set(a)];
const assert=(ok,message)=>{if(!ok)throw Error(message);};
export const loadInputs=()=>({a:read(`${root}/step56-admin-ux-contract.json`),gates:names.map(n=>read(`${root}/step56-${n}-wireframes.json`))});
export function auditUnion({a,gates}){
 assert(gates.length===6&&same(gates.map(g=>g.substep),['B','C','D','E','F','G']),'B-G gate ownership');
 const screens=gates.flatMap(g=>g.screens),ops=screens.flatMap(s=>s.operations);
 assert(screens.length===97&&unique(screens.map(s=>s.id)).length===97,'97 unique surface obligations');
 assert(same(sorted(screens.map(s=>s.id)),sorted(a.screenInventory.map(s=>s.id))),'Complete foundation surface union');
 assert(ops.length===532&&unique(ops).length===532&&same(sorted(ops),sorted(a.operationEvidence.map(o=>o.key))),'532 operations with exactly one owner');
 const rows=[],operationRows=[],states=[];
 for(const gate of gates){
  assert(gate.status===`${gate.substep}_COMPLETE_STEP_IN_PROGRESS`,'Historical gate completion');
  for(const key of ['foundation','responsive','accessibility','typography','boundary','sourceGaps'])assert(same(gate[key],a[key]),`Inherited ${key}`);
  assert(gate.canonicalSource==='repository'&&gate.figmaMirror==='OPTIONAL_NOT_REQUIRED','Repository design authority');
  assert(gate.review.visual==='PASS_SAMPLED_STATIC_COMPOSITIONS'&&same(gate.review.widths,[320,360,600,840,1200,1440])&&gate.review.zoomPercent===400,'Inherited review coverage');
  assert((gate.review.runtimeCertified??gate.review.runtimeAccessibilityCertified)===false,'No runtime certification');
  for(const s of gate.screens){
   const expected=a.screenInventory.find(x=>x.id===s.id);
   assert(expected.gate===`56-${gate.substep}`,'Gate owns assigned surface');
   for(const key of ['title','task','actors','journeys','domains','operations','requiredFacets','blockedOperations'])assert(same(s[key],expected[key]),`Surface trace ${s.id}/${key}`);
   assert(unique(s.views.map(v=>v.id)).length===s.views.length,'Unique local view ids');
   assert(same(sorted(s.states.map(x=>x.id)),sorted(expected.requiredStates)),'Complete state coverage');
   assert(s.behavior.length>40&&Object.keys(s.focus).length===4,'Explicit behavior/focus');
   for(const st of s.states){assert(s.views.some(v=>v.id===st.view)&&st.behavior.length>40,'State target and disposition');states.push({surface:s.id,...st});}
   assert(s.operationViews.length===s.operations.length&&same(sorted(s.operationViews.map(o=>o.operation)),sorted(s.operations)),'Operation view coverage');
   for(const ov of s.operationViews){
    const source=a.operationEvidence.find(o=>o.key===ov.operation),blocked=source.executionAuthority.startsWith('NO_ACTION');
    assert(ov.executionAuthority===source.executionAuthority&&same(ov.permissionClaims??ov.permissions,source.permissionClaims),'Exact operation authority');
    const [target,view]=ov.view.includes('/')?ov.view.split('/'):[s.id,ov.view];
    const targetSurface=screens.find(x=>x.id===target),v=targetSurface?.views.find(x=>x.id===view);
    assert(v,'Resolved local/shared view');
    if(blocked)assert(v.kind==='unavailable'&&ov.executionEnabled!==true&&!ov.confirmationView&&!ov.resultView,'Blocked operations cannot execute or succeed');
    operationRows.push({operation:ov.operation,owner:s.id,gate:gate.substep,view:`${target}/${view}`,permissionClaims:source.permissionClaims,executionAuthority:source.executionAuthority,blocked,stepUp:source.runtime?.stepUp??null,idempotencyScope:source.runtime?.idempotencyScope??null,gapIds:a.sourceGaps.filter(g=>g.operations.includes(ov.operation)).map(g=>g.id)});
   }
   rows.push({id:s.id,gate:gate.substep,task:s.task,actors:s.actors,journeys:s.journeys,domains:s.domains,permissions:expected.permissions,facets:s.requiredFacets,operations:s.operations,states:s.states.length,views:s.views.map(v=>v.id),focus:s.focus,blockedOperations:s.blockedOperations});
  }
 }
 const journeys=a.journeys.map(j=>{
  const owners=rows.filter(s=>s.journeys.includes(j.id));assert(owners.length,'Every journey has surfaces');
  const steps=j.operations.map(operation=>{const o=operationRows.find(o=>o.operation===operation);assert(o,'Every journey operation has owner');assert(owners.some(s=>s.id===o.owner),'Journey operation owner is linked');return {operation,owner:o.owner,view:o.view,blocked:o.blocked};});
  return {id:j.id,title:j.title,entry:j.entry,intendedSuccess:j.success,surfaces:owners.map(s=>s.id),steps,designVerdict:'PASS',execution:steps.some(o=>o.blocked)?'RESTRICTED_BY_NO_ACTION':'SUBJECT_TO_SERVER_POLICY_NOT_RUNTIME_CERTIFIED'};
 });
 assert(journeys.length===12&&unique(journeys.map(j=>j.id)).length===12,'12 unique journeys');
 const counts={actors:a.actors.length,journeys:journeys.length,domains:a.domains.length,surfaces:rows.length,operations:ops.length,blocked:operationRows.filter(o=>o.blocked).length,supported:operationRows.filter(o=>!o.blocked).length,states:states.length,views:rows.reduce((n,s)=>n+s.views.length,0),screenJourneyLinks:rows.reduce((n,s)=>n+s.journeys.length,0)};
 return {counts,surfaces:rows,operations:operationRows,journeys,states,sourceGaps:a.sourceGaps};
}
function walk(p){return readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(p+'/'+d.name):[p+'/'+d.name]);}
export function auditManifests(gates){
 return gates.map(g=>{
  const folder=`${root}/step56-wireframes/${g.substep}`,path=`${folder}/manifest.json`,m=read(path),contract=`${root}/step56-${names['BCDEFG'.indexOf(g.substep)]}-wireframes.json`;
  assert(m.source===contract&&m.sourceSha256===hash(normalized(contract)),'Manifest source hash');
  assert(m.screenCount===g.screens.length&&m.substep===g.substep,'Manifest gate coverage');
  assert(unique(m.artifacts.map(x=>x.path)).length===m.artifacts.length,'Unique manifest paths');
  assert(same(sorted(walk(folder)),sorted([path,...m.artifacts.map(x=>x.path)])),'No missing/extra artifacts');
  const frames=m.artifacts.filter(x=>x.path.endsWith('.svg'));
  assert(frames.length===m.frameCount,'Frame count');
  for(const x of m.artifacts){
   assert(x.path.startsWith(folder+'/')&&!x.path.includes('..'),'Artifact stays within gate');
   const content=normalized(x.path);assert(hash(content)===x.sha256&&Buffer.byteLength(content)===x.bytes,'Artifact digest and size');
   if(x.path.endsWith('.svg')){
    const match=x.path.match(/\/(AD-[B-G]-\d+)--(\d+)--(.+)--v1\.svg$/);assert(match,'Stable frame name');
    const screen=g.screens.find(s=>s.id===match[1]);assert(screen?.views.some(v=>v.id===match[3]),'Frame has owning view');
    assert(content.includes(`width="${match[2]}"`)&&content.includes('role="img"')&&content.includes('aria-labelledby="title desc"')&&content.includes('<title')&&content.includes('<desc'),'SVG accessible identity/width');
    assert(content.includes('direction="rtl"')&&!/<script\b|<foreignObject\b|<[a-z][^>]*\son\w+=|<[a-z][^>]*(?:href|src)="https?:/i.test(content),'Static RTL frame with no executable/external content '+x.path);
   }
  }
  for(const s of g.screens)for(const [i,v] of s.views.entries()){
   const widths=frames.filter(f=>f.path.endsWith(`--${v.id}--v1.svg`)&&f.path.includes('/'+s.id+'/')).map(f=>Number(f.path.match(/--(\d+)--/)[1]));
   assert([320,1440].every(w=>widths.includes(w)),'Every variant compact/expanded');
   if(i===0)assert([320,360,600,840,1200,1440].every(w=>widths.includes(w)),'Primary six-width coverage');
  }
  return {gate:g.substep,path,sha256:hash(normalized(path)),surfaces:g.screens.length,frames:frames.length,artifacts:m.artifacts.length+1,review:g.review};
 });
}
export function buildAudit(){
 const inputs=loadInputs(),union=auditUnion(inputs),manifests=auditManifests(inputs.gates),handoffs=read(`${root}/step56-final-handoffs.json`),transport=read(`${root}/step56-final-transport-evidence.json`);
 for(const h of handoffs){assert(h.surfaces.length>=2&&h.surfaces.every(id=>union.surfaces.some(s=>s.id===id)),'Handoff endpoints');assert(h.context.length>=2&&h.restriction.length>80&&h.recovery.length>40,'Handoff guard and recovery');}
 assert(transport.gates.length===7&&transport.gates.every(g=>g.merged&&g.ci.head.length&&g.ci.merge.length),'A-G transport evidence');
 for(const g of transport.gates)for(const stage of ['head','merge'])assert(g.ci[stage].every(x=>x.head===g[stage]&&x.conclusion==='success'),'Exact historical CI head');
 const paths=[`${root}/step56-admin-ux-contract.json`,...names.map(n=>`${root}/step56-${n}-wireframes.json`),`${root}/step56-final-handoffs.json`,`${root}/step56-final-transport-evidence.json`,'scripts/step56-final-audit.mjs',...manifests.map(m=>m.path)];
 return {schemaVersion:1,step:56,substep:'H',status:'CLOSED_FINAL_GATE_PASS',designOnly:true,runtimeRelease:'BLOCKED_BY_OPEN_IMPLEMENTATION_EVIDENCE',nextStep:57,nextStepStatus:'NOT_STARTED',baseline:transport.baseline,canonicalSource:'repository',figmaMirror:'OPTIONAL_NOT_REQUIRED',counts:{...union.counts,frames:manifests.reduce((n,m)=>n+m.frames,0),artifacts:manifests.reduce((n,m)=>n+m.artifacts,0)},designExceptions:[],limitations:['No runtime/API/permission reconciliation','Static equivalent320 reflow only; no actual400% zoom, keyboard or screen-reader certification','Historical gate nextGate values are immutable snapshots','H does not start Step57 or create new page wireframes'],sources:paths.sort().map(path=>({path,sha256:hash(normalized(path))})),transport,manifests,handoffs,...Object.fromEntries(Object.entries(union).filter(([k])=>k!=='counts'))};
}
