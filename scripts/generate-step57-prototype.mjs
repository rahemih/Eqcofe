import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='docs/13-product-design/step57-prototype';
const contract=JSON.parse(readFileSync('docs/13-product-design/step57-high-fidelity-contract.json','utf8'));
const keys=['id','title','area','journeys','layout','task','primaryAction','content','views','states','blockedOperations','operationViews'];
const screens=contract.screens.map(s=>Object.fromEntries(keys.filter(k=>s[k]!==undefined&&!(k==='states'&&s.area==='admin')).map(k=>[k,k==='operationViews'?s[k].map(o=>({operation:o.operation,view:o.view,executionAuthority:o.executionAuthority})):s[k]])));
const check=process.argv.includes('--check');
function artifact(path,value){const text=JSON.stringify(value)+'\n';if(check){if(readFileSync(path,'utf8')!==text)throw Error('Prototype drift: '+path);}else writeFileSync(path,text);}
artifact(base+'/src/coverage.json',{screens});
function walk(dir){return readdirSync(dir,{withFileTypes:true}).filter(e=>!['node_modules','dist','.git'].includes(e.name)&&!e.name.endsWith('.log')).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
const tokenSource=readFileSync('docs/13-product-design/generated/eqcofe-design-tokens.css','utf8').trimEnd()+'\n';
if(check){if(readFileSync(base+'/src/design-tokens.css','utf8')!==tokenSource)throw Error('Step54 token drift');}else writeFileSync(base+'/src/design-tokens.css',tokenSource);
const files=walk(base).filter(p=>!p.endsWith('/manifest.json')).sort().map(path=>({path:path.slice(base.length+1),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
artifact(base+'/manifest.json',{schemaVersion:1,status:'IN_PROGRESS',files});
console.log('Step57 prototype: '+screens.length+' source-linked routes; '+files.length+' hashed files');
