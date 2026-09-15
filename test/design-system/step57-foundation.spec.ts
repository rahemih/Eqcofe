import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Repository-native design validator
import {validateStep57} from '../../scripts/validate-step57-foundation.mjs';
const read=()=>JSON.parse(readFileSync('docs/13-product-design/step57-high-fidelity-contract.json','utf8'));
test('Step57 inherited design union validates',()=>assert.deepEqual(validateStep57(read()),[]));
for(const [name,mutate] of [
 ['omitted sources',(c:any)=>c.sources=[]],
 ['duplicate source',(c:any)=>c.sources[0]=c.sources[1]],
 ['omitted closure gates',(c:any)=>c.closure={}],
 ['unreviewed screen approval',(c:any)=>c.screens[0].reviewStatus='PASS'],
 ['false declared scope',(c:any)=>c.scope.total=0],
 ['starting baseline substitution',(c:any)=>c.baseline='0'.repeat(40)],
 ['mandatory paid mirror',(c:any)=>c.constraints.figmaRequired=true],
 ['lost surface',(c:any)=>c.screens.pop()],
 ['duplicate surface',(c:any)=>c.screens[0]=c.screens[1]],
 ['unreviewed closure',(c:any)=>c.status='CLOSED'],
 ['fabricated CI',(c:any)=>c.closure.exactHeadCI='PASS'],
 ['lost required flow',(c:any)=>c.requiredInteractiveJourneys.pop()],
 ['source substitution',(c:any)=>c.sources[0].sha256='0'.repeat(64)],
 ['permission widening',(c:any)=>{const s=c.screens.find((s:any)=>s.operationViews.length);s.operationViews[0].permissionClaims={runtime:['admin.all']};}],
 ['lost operation',(c:any)=>c.operations.pop()],
 ['lost mobile review',(c:any)=>c.viewports.shift()],
 ['Wallet reintroduced',(c:any)=>c.constraints.wallet=true],
] as Array<[string,(c:any)=>void]>)test('Step57 rejects '+name,()=>{const c=read();mutate(c);assert.ok(validateStep57(c).length);});
