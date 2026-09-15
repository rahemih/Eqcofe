import {readFileSync,writeFileSync} from 'node:fs';

const contractPath='docs/13-product-design/step57-high-fidelity-contract.json';
const coveragePath='docs/13-product-design/step57-prototype/src/coverage.json';
const contract=JSON.parse(readFileSync(contractPath,'utf8').replace(/^\uFEFF/,''));
const coverage=JSON.parse(readFileSync(coveragePath,'utf8').replace(/^\uFEFF/,''));
const sourceById=new Map(contract.screens.map(screen=>[screen.id,screen]));
const screens=coverage.screens.map(screen=>{
  const source=sourceById.get(screen.id);
  if(!source)throw new Error(`Missing Step57 source screen: ${screen.id}`);
  return {...screen,states:Array.isArray(source.states)?source.states:[]};
});
const adminStates=screens.filter(screen=>screen.area==='admin').reduce((sum,screen)=>sum+screen.states.length,0);
const storefrontStates=screens.filter(screen=>screen.area==='storefront').reduce((sum,screen)=>sum+screen.states.length,0);
if(adminStates!==4472)throw new Error(`Expected 4472 admin states, found ${adminStates}`);
if(storefrontStates<1)throw new Error('Storefront state projection is empty');
writeFileSync(coveragePath,JSON.stringify({screens})+'\n');
console.log(`Prepared ephemeral Step57 full-state QA projection: ${adminStates} admin states + ${storefrontStates} storefront states`);
