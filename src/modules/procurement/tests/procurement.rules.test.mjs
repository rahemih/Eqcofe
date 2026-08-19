import test from 'node:test';import assert from 'node:assert/strict';
function allocQ(total,items){let q=items.reduce((s,x)=>s+x.quantity,0),left=total;return items.map((x,i)=>{let a=i===items.length-1?left:Math.floor(total*x.quantity/q);left-=a;return a})}
function allocV(total,items){let v=items.reduce((s,x)=>s+x.quantity*x.cost,0),left=total;return items.map((x,i)=>{let a=i===items.length-1?left:Math.floor(total*x.quantity*x.cost/v);left-=a;return a})}
test('receipt arithmetic exact',()=>assert.equal(7+2+1,10));
test('quantity landed allocation exact',()=>assert.deepEqual(allocQ(101,[{quantity:1},{quantity:1}]),[50,51]));
test('value landed allocation exact',()=>assert.deepEqual(allocV(100,[{quantity:1,cost:100},{quantity:1,cost:300}]),[25,75]));
test('landed allocation keeps total',()=>assert.equal(allocQ(999,[{quantity:2},{quantity:3},{quantity:7}]).reduce((a,b)=>a+b,0),999));
