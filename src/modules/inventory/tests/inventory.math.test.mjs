import assert from 'node:assert/strict';
const physicalAvailable=b=>Math.max(0,b.onHand-b.reserved-b.allocated-b.damaged-b.quarantine);
const protectedPhysicalQuantity=b=>Math.ceil(physicalAvailable(b)*Math.max(0,Math.min(100,b.protectionPercent??0))/100);
const onlineSellable=b=>Math.max(0,physicalAvailable(b)-protectedPhysicalQuantity(b));
const b={onHand:100,reserved:10,allocated:20,damaged:5,quarantine:5,protectionPercent:20};
assert.equal(physicalAvailable(b),60);assert.equal(protectedPhysicalQuantity(b),12);assert.equal(onlineSellable(b),48);
function fifo(layers,q){let left=q,out=[];for(const l of [...layers].sort((a,b)=>a.t-b.t)){let n=Math.min(left,l.q);if(n){out.push([l.id,n,l.c]);left-=n;}if(!left)break;}if(left)throw Error();return out;}
assert.deepEqual(fifo([{id:'a',q:3,c:100,t:1},{id:'b',q:5,c:120,t:2}],6),[['a',3,100],['b',3,120]]);
let failed=false;try{fifo([{id:'a',q:1,c:1,t:1}],2)}catch{failed=true}assert.equal(failed,true);
console.log('inventory math tests: 5/5 PASS');
