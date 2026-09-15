import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const repoRoot=dirname(dirname(fileURLToPath(import.meta.url)));
const contractPath=join(repoRoot,'docs/13-product-design/step57-high-fidelity-contract.json');
const coveragePath=join(repoRoot,'docs/13-product-design/step57-prototype/src/coverage.json');
const evidenceDir=join(repoRoot,'docs/13-product-design/step57-prototype/qa-evidence');
const contract=JSON.parse(readFileSync(contractPath,'utf8'));
const keys=['id','title','area','journeys','layout','task','primaryAction','content','views','states','blockedOperations','operationViews'];
const screens=contract.screens.map(screen=>Object.fromEntries(keys.filter(key=>screen[key]!==undefined).map(key=>[key,key==='operationViews'?screen[key].map(item=>({operation:item.operation,view:item.view,executionAuthority:item.executionAuthority})):screen[key]])));
writeFileSync(coveragePath,JSON.stringify({screens})+'\n');
mkdirSync(evidenceDir,{recursive:true});
const admin=screens.filter(screen=>screen.area==='admin');
const report={
  schemaVersion:1,
  source:'docs/13-product-design/step57-high-fidelity-contract.json',
  screens:screens.length,
  storefront:screens.filter(screen=>screen.area==='storefront').length,
  admin:admin.length,
  adminViews:admin.reduce((sum,screen)=>sum+(screen.views?.length||0),0),
  adminStates:admin.reduce((sum,screen)=>sum+(screen.states?.length||0),0),
  journeys:new Set(screens.flatMap(screen=>screen.journeys||[])).size,
  purpose:'Ephemeral full-state browser QA projection; does not alter runtime/API/business authority.'
};
writeFileSync(join(evidenceDir,'qa-projection.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Step57 exhaustive QA projection: ${report.screens} screens; ${report.adminViews} admin views; ${report.adminStates} admin states; ${report.journeys} journeys`);
if(report.screens!==134||report.storefront!==37||report.admin!==97||report.adminViews!==1142||report.adminStates!==4472||report.journeys!==24)throw new Error('Step57 exhaustive QA projection inventory drift');
