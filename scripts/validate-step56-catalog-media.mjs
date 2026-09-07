import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const a=read('docs/13-product-design/step56-admin-ux-contract.json');const b=read('docs/13-product-design/step56-admin-shell-wireframes.json');
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(p+'/'+x.name):[p+'/'+x.name]);
export function validateCatalog(c){const errors=[];const check=(ok,msg)=>{if(!ok)errors.push(msg);};
 check(c.step===56&&c.substep==='C'&&c.status==='C_COMPLETE_STEP_IN_PROGRESS'&&c.nextGate==='56-D'&&c.nextGateStatus==='NOT_STARTED','C-only lifecycle');
 check(c.baseline==='d07c4858d552e371b36c3c4912f0eda665418b7d'&&same(c.handoff,{pr:155,head:'eabcd5288fff1892e387e09e80dc7c67e46d9090',ci:34031141313,postMergeCi:34031226933}),'B handoff');
 for(const k of ['foundation','typography','responsive','accessibility','boundary','sourceGaps'])check(same(c[k],a[k]),'Inherited '+k);
 check(same(c.layout,b.layout)&&same(c.adminNavigation,b.adminNavigation),'B shell inheritance');
 check(c.canonicalSource==='repository'&&c.figmaMirror==='OPTIONAL_NOT_REQUIRED','Repository authority');
 const paths=['docs/13-product-design/step56-admin-ux-contract.json','docs/13-product-design/step56-admin-shell-wireframes.json',...walk('src/modules/catalog').filter(x=>x.endsWith('.ts')),'test/catalog-domain.spec.ts'].sort();
 check(same(c.sources?.map(x=>x.path),paths),'Complete source set');
 for(const s of c.sources??[]){try{check(createHash('sha256').update(readFileSync(s.path,'utf8').replaceAll('\r\n','\n')).digest('hex')===s.sha256,'Source hash '+s.path);}catch{check(false,'Missing source');}}
 const invariants={productRestoreState:'draft',productRestoreSalesEnabled:false,publishRequiresActiveVariant:true,publishPriceCondition:'WHEN_SALES_ENABLED',mediaMaxBytes:52428800,mediaMimeTypes:['image/jpeg','image/png','image/webp','video/mp4'],mediaCompleteState:'processing',mediaApproveFrom:['processing','quarantine'],mediaRejectFrom:['uploading','processing','quarantine'],mediaDeleteWhenReferenced:false,primaryMediaMaximum:1,detachDeletesAsset:false,reorderAlternatives:['move-up','move-down'],salesPreviewLifetimeSeconds:600,salesApplyStepUp:true,countCheck:'STORED_PREVIEW_ONLY',unknownMutation:'READ_OR_MANUAL_NO_RETRY',history:'NO_HTTP_READ_ENDPOINT',productAdminPagination:['limit','cursor'],productAdminLimitMax:100,assignmentWrite:'REPLACE_FULL_SET'};
 check(same(c.invariants,invariants),'Source semantics');
 check(same(c.limitations,{previewFreshRecount:false,previewRequesterBinding:false,catalogHistoryEndpoint:false,mediaListEndpoint:false,storageByteVerification:false,runtimeReadinessCertified:false,automaticMutationRetry:false,assignmentIfMatch:false,productDescriptionPrefill:false}),'Unsupported guarantee');
 check(same(c.rules?.map(r=>r.id),['product-lifecycle','version-policy','variant-policy','attribute-policy','attribute-scope','media-attachment','taxonomy-policy','media-upload','media-states','media-storage','sales-preview','read-boundaries']),'Rule coverage');
 for(const r of c.rules??[])check(paths.includes(r.source)&&r.requirement?.length>90,'Rule evidence');
 const expected=a.screenInventory.filter(s=>s.gate==='56-C');check(same(c.screens?.map(s=>s.id),expected.map(s=>s.id)),'C ownership');
 const requiredViews=[['list','detail','edit','publish','archive','restore','conflict','sales'],['list','edit','sales','conflict'],['list','definition','value','assign','mismatch'],['gallery','attach','reorder','detach'],['list','edit','sales','conflict'],['tree','edit','cycle','sales'],['upload','processing','review','reject','delete','unavailable','in-use'],['scope','preview','apply','expired','unknown']];
 for(const [i,s] of (c.screens??[]).entries()){const e=expected[i];if(!e)continue;
  for(const k of ['id','title','task','actors','journeys','domains','operations','permissions','requiredFacets','blockedOperations'])check(same(s[k],e[k]),'Trace '+e.id+' '+k);
  check(same(s.views?.map(v=>v.id),requiredViews[i]),'View coverage '+e.id);
  check(same(s.states?.map(st=>st.id),e.requiredStates),'State coverage '+e.id);
  check(same(s.operationEvidence,a.operationEvidence.filter(o=>e.operations.includes(o.key))),'Operation provenance '+e.id);
  check(same(s.operationViews?.map(v=>v.operation),s.operationEvidence?.map(o=>o.key)),'Operation view coverage');
  for(const ov of s.operationViews??[]){const op=s.operationEvidence.find(o=>o.key===ov.operation);check(s.views.some(v=>v.id===ov.view)&&same(ov.permissionClaims,op?.permissionClaims)&&ov.executionAuthority===op?.executionAuthority&&ov.stepUp===op?.runtime?.stepUp,'Operation authority');}
  for(const st of s.states??[])check(s.views.some(v=>v.id===st.view)&&st.behavior?.length>65,'State disposition');
  check(s.behavior?.length>100&&Object.keys(s.focus??{}).length===4,'Behavior/focus');
 }
 check(c.review.runtimeCertified===false&&same(c.review.widths,[320,360,600,840,1200,1440])&&c.review.zoomPercent===400,'Review limit');
 if(c.review.visual!=='PASS_SAMPLED_STATIC_COMPOSITIONS')check(false,'Visual review pending');
 return errors;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const e=validateCatalog(read('docs/13-product-design/step56-catalog-media-wireframes.json'));if(e.length)throw Error(e.join('\n'));console.log('Step 56-C catalog/media: PASS');}
