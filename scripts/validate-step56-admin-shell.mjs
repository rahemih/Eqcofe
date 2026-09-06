import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const a=read('docs/13-product-design/step56-admin-ux-contract.json');
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
export function validateShell(c){
 const errors=[];const check=(ok,msg)=>{if(!ok)errors.push(msg);};
 check(c.step===56&&c.substep==='B'&&c.status==='B_COMPLETE_STEP_IN_PROGRESS','B status');
 check(c.baseline==='a682677d8ce995922954acbea175e4720e5d57e6'&&same(c.aEvidence,{pr:154,head:'b00de34f16d8aefb2c760640b5abafe5f3e3e88a',ci:34013181279,postMergeCi:34013254103}),'A handoff');
 check(c.nextGate==='56-C'&&c.nextGateStatus==='NOT_STARTED','C must not start');
 check(same(c.boundary,a.boundary)&&Object.values(c.boundary).every(x=>x===false),'runtime boundary');
 for(const k of ['responsive','accessibility','typography','foundation','adminNavigation','shellAuthorityDependency','sourceGaps'])check(same(c[k],a[k]),'Inherited '+k);
 check(c.canonicalSource==='repository'&&c.figmaMirror==='OPTIONAL_NOT_REQUIRED','repository authority');
 const paths=['docs/13-product-design/step56-admin-ux-contract.json','src/modules/identity/application/admin-auth.service.ts','src/modules/identity/presentation/auth.controller.ts','src/modules/identity/application/webauthn.service.ts'];
 check(same(c.sources?.map(x=>x.path),paths),'source set');
 for(const src of c.sources??[]){try{check(createHash('sha256').update(readFileSync(src.path,'utf8').replaceAll('\r\n','\n')).digest('hex')===src.sha256,'Source hash '+src.path);}catch{check(false,'Missing source');}}
 check(same(c.authSequence,['password-preauth','fido-challenge','fido-verify','read-session-permissions-scopes']),'FIDO cannot be bypassed');
 check(same(c.authorization,{unknown:'NO_ACTION',permissions:'ALL_REQUIRED_PER_OPERATION',scopes:'SERVER_ASSIGNED_INTERSECTION',quickActions:'NAVIGATE_TO_REVIEW_ONLY',search:'LOCAL_AUTHORIZED_DESTINATION_TITLES_ONLY',notifications:'NO_PERSONAL_FEED_OR_BADGE_WITHOUT_SOURCE',dashboard:'UNAVAILABLE_ONLY'}),'Authority expansion');
 check(c.layout.touchMinPx>=44&&c.layout.expandedMinWidth===840&&c.layout.sidebarWidth===240,'Layout target');
 const expected=a.screenInventory.filter(s=>s.gate==='56-B');
 check(same(c.screens?.map(s=>s.id),expected.map(s=>s.id)),'B ownership');
 const requiredViews=[['login','key','enrollment','credentials','auth-error'],['identity','scope','revoked'],['unavailable','destinations'],['shell','drawer','denied'],['search','no-results'],['table','detail','form','conflict'],['confirmation','step-up','unknown','outcome']];
 for(const [i,s] of (c.screens??[]).entries()){
  const e=expected[i];if(!e)continue;
  for(const k of ['id','title','task','journeys','actors','domains','operations','blockedOperations','requiredFacets'])check(same(s[k],e[k]),'Trace '+e.id+' '+k);
  check(same(s.views?.map(v=>v.id),requiredViews[i]),'View coverage '+e.id);
  check(same(s.states?.map(st=>st.id),e.requiredStates),'State coverage '+e.id);
  check(same(s.operationViews?.map(v=>v.operation),e.operations),'Operation view coverage '+e.id);
  for(const ov of s.operationViews??[]){const evidence=a.operationEvidence.find(o=>o.key===ov.operation);const [sid,vid]=ov.view.split('/');check(c.screens.some(x=>x.id===sid&&x.views.some(v=>v.id===vid))&&same(ov.permissions,evidence?.permissionClaims)&&ov.executionAuthority===evidence?.executionAuthority,'Operation view authority');}
  check(s.behavior?.length>100&&Object.keys(s.focus??{}).length===4,'Behavior/focus '+e.id);
  for(const st of s.states??[]){check(s.views.some(v=>v.id===st.view)&&st.behavior?.length>70,'State disposition '+st.id);if(e.id==='AD-B-03')check(st.coverage==='UNAVAILABLE_ONLY'&&st.view==='unavailable','Dashboard false success');}
  for(const v of s.views??[])check(v.items?.length>=3&&v.title&&v.action,'View content '+v.id);
 }
 check(same(c.destinations?.map(d=>d.surface),a.screenInventory.map(s=>s.id)),'Destination union');
 for(const [i,d] of (c.destinations??[]).entries()){check(a.adminNavigation.some(g=>g.id===d.group),'Destination group');check(same(d.operations,a.screenInventory[i]?.operations)&&d.visibility==='SERVER_AUTHORIZED_CONTEXT_ONLY'&&d.unresolved==='NO_ACTION'&&d.target==='DESIGN_SURFACE_ID_NOT_INVENTED_URL','Destination authority');}
 check(c.review.visual==='PASS_SAMPLED_STATIC_COMPOSITIONS'&&c.review.samples?.length>=7,'Visual review evidence');
 check(same(c.review.widths,[320,360,600,840,1200,1440])&&c.review.zoomPercent===400&&c.review.runtimeAccessibilityCertified===false,'Review boundaries');
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const e=validateShell(read('docs/13-product-design/step56-admin-shell-wireframes.json'));if(e.length)throw Error(e.join('\n'));console.log('Step 56-B shell contract: PASS');}
