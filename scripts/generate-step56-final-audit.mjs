import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {buildAudit,root,hash,normalized} from './step56-final-audit.mjs';
const c=buildAudit(),folder=`${root}/step56-final-audit`,files={},json=x=>JSON.stringify(x,null,2)+'\n';
files[`${root}/step56-final-audit.json`]=json(c);
files[`${folder}/surface-matrix.json`]=json(c.surfaces);
files[`${folder}/operation-matrix.json`]=json(c.operations);
files[`${folder}/journey-matrix.json`]=json(c.journeys);
files[`${folder}/state-matrix.json`]=json(c.states);
files[`${folder}/release-blockers.json`]=json({status:c.runtimeRelease,gaps:c.sourceGaps,blockedOperations:c.operations.filter(o=>o.blocked)});
files[`${folder}/README.md`]=`# Step56-H union audit\n\nDesign coverage PASS; runtime release ${c.runtimeRelease}. No new wireframes. Step57 NOT_STARTED.\n\n| Gate | Surfaces | Frames | Artifacts |\n|---|---:|---:|---:|\n${c.manifests.map(m=>`| ${m.gate} | ${m.surfaces} | ${m.frames} | ${m.artifacts} |`).join('\n')}\n\nCounts: ${JSON.stringify(c.counts)}.\n\nEvery operation has one owner; shared B presentation targets do not duplicate ownership. Source gaps overlap and must not be summed as distinct blocked operations. Journey success is intended design outcome, not evidence of executable availability. See journey/operation/state matrices and the specification for conditional handoffs. Existing gate manifests retain prior sampled visual-review limitations.\n`;
files[`${folder}/manifest.json`]=json({step:56,substep:'H',newPageWireframes:0,artifacts:Object.entries(files).map(([path,t])=>({path,sha256:hash(t),bytes:Buffer.byteLength(t)}))});
if(process.argv.includes('--check')){
 for(const [p,t] of Object.entries(files))if(normalized(p)!==t)throw Error('H artifact drift '+p);
 for(const p of readdirSync(folder))if(!(folder+'/'+p in files))throw Error('Unexpected H artifact '+p);
}else {mkdirSync(folder,{recursive:true});for(const [p,t] of Object.entries(files))writeFileSync(p,t);}
console.log('Step56-H final audit: PASS '+JSON.stringify(c.counts));
