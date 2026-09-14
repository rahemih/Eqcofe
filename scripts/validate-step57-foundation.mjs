import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='docs/13-product-design',read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
export function validateStep57(c){const errors=[];const check=(ok,msg)=>{if(!ok)errors.push(msg);};
 try{
 const expectedSources=['step53-experience-contract.json','step54-design-system-contract.json','step55-discovery-wireframes.json','step55-product-evaluation-wireframes.json','step55-checkout-payment-wireframes.json','step55-account-wholesale-after-sales-wireframes.json','step55-content-policy-final-audit-wireframes.json','step56-admin-shell-wireframes.json','step56-catalog-media-wireframes.json','step56-pricing-inventory-wireframes.json','step56-commerce-operations-wireframes.json','step56-customers-growth-wireframes.json','step56-management-security-wireframes.json','step56-final-audit.json','step56-final-handoffs.json'].map(n=>`${root}/${n}`).sort();
 check(JSON.stringify(c.sources.map(s=>s.path).sort())===JSON.stringify(expectedSources),'Pinned source inventory drift');
 check(c.baseline==='01f0fa033af07c5ba5189b2c85ebfe51b095cdba','Starting baseline drift');
 check(c.scope.storefront===37&&c.scope.admin===97&&c.scope.total===134&&c.scope.journeys===24,'Declared scope drift');
 check(JSON.stringify(Object.keys(c.closure).sort())===JSON.stringify(['visualReview','interactionReview','accessibilityReview','exactHeadCI','merge'].sort()),'Closure gate inventory drift');
 check(c.screens.every(s=>s.reviewStatus==='PENDING'),'Unreviewed surface approval');
 check(c.constraints.figmaRequired===false,'Optional Figma mirror became mandatory');
 check(c.step===57&&c.status==='IN_PROGRESS','Unreviewed Step57 cannot close');
 check(c.screens.length===134&&new Set(c.screens.map(s=>s.id)).size===134,'Surface inventory must be complete and unique');
 check(c.screens.filter(s=>s.area==='storefront').length===37&&c.screens.filter(s=>s.area==='admin').length===97,'Surface area counts drift');
 check(JSON.stringify(c.viewports)==='[320,360,600,840,1200,1440]','Responsive widths drift');
 check(c.journeys.length===24,'Journey coverage drift');
 for(const source of c.sources)check(createHash('sha256').update(readFileSync(source.path)).digest('hex')===source.sha256,'Source hash drift: '+source.path);
 for(const s of c.screens){const inherited=read(s.source).screens.find(x=>x.id===s.id);check(!!inherited,'Unknown surface '+s.id);for(const field of ['operations','journeys','actors'])check(JSON.stringify(s[field])===JSON.stringify(inherited[field]),'Inherited '+field+' drift '+s.id);check(JSON.stringify(s.blockedOperations)===JSON.stringify(inherited.blockedOperations||[]),'NO_ACTION drift '+s.id);check(JSON.stringify(s.operationViews)===JSON.stringify(inherited.operationViews||[]),'Permission/view authority drift '+s.id);}
 check(JSON.stringify(c.operations)===JSON.stringify(read(`${root}/step56-final-audit.json`).operations),'Operation authority union drift');
 check(c.constraints.rtl&&c.constraints.language==='fa'&&c.constraints.currency==='integer Toman'&&!c.constraints.wallet&&!c.constraints.brown&&!c.constraints.runtimeChanges&&!c.constraints.permissionReconciliation,'Design constraints drift');
 check(['SJ-03','SJ-04','SJ-05','SJ-08','SJ-09','SJ-10'].every(j=>c.requiredInteractiveJourneys.includes(j)),'Required flow missing');
 check(Object.values(c.closure).every(x=>x==='PENDING'),'Closure evidence cannot be fabricated');
 }catch(e){errors.push(e.message);}return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const e=validateStep57(read(`${root}/step57-high-fidelity-contract.json`));if(e.length)throw Error(e.join('\n'));console.log('Step57 foundation validation PASS; design approval remains pending');}
