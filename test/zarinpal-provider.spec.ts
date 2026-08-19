import test from 'node:test';
import assert from 'node:assert/strict';
import {ZarinpalPaymentProvider} from '../src/modules/payments/infrastructure/zarinpal-payment.provider';
import {DomainError} from '../src/shared/errors/domain-error';

const merchant='11111111-1111-4111-8111-111111111111';
class FakeConfig{
  constructor(private readonly values:Record<string,unknown>={}){}
  get<T>(key:string,fallback?:T):T{return (key in this.values?this.values[key]:fallback) as T;}
}
function provider(values:Record<string,unknown>={}){return new ZarinpalPaymentProvider(new FakeConfig({ZARINPAL_MERCHANT_ID:merchant,ZARINPAL_SANDBOX:true,ZARINPAL_TIMEOUT_MS:5000,...values}) as any);}
function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});}

test('ZarinPal initiate uses sandbox, IRT and merchant-controlled verify',async()=>{
  let seenUrl='',seenBody:any;
  globalThis.fetch=async (url:any,init:any)=>{seenUrl=String(url);seenBody=JSON.parse(String(init.body));return response({data:{code:100,authority:'S000000000000000000000000000000001'},errors:[]});};
  const r=await provider().initiate({payment_id:'p1',order_number:'EQ-100',amount_toman:125000,callback_url:'https://eqcofe.example/payments/p1/callback?state=x'});
  assert.equal(seenUrl,'https://sandbox.zarinpal.com/pg/v4/payment/request.json');
  assert.equal(seenBody.amount,125000);assert.equal(seenBody.currency,'IRT');assert.equal(seenBody.metadata.order_id,'EQ-100');assert.equal(seenBody.metadata.auto_verify,false);
  assert.equal(r.authority,'S000000000000000000000000000000001');assert.match(r.redirect_url,/sandbox\.zarinpal\.com\/pg\/StartPay\/S/);
});

test('ZarinPal verify accepts first and repeated verification codes',async()=>{
  for(const code of [100,101]){
    globalThis.fetch=async()=>response({data:{code,ref_id:987654},errors:[]});
    const r=await provider().verify({authority:'S1',amount_toman:99000});
    assert.equal(r.status,'paid');assert.equal(r.reference,'987654');assert.equal(r.amount_toman,99000);assert.equal(r.code,String(code));
  }
});

test('ZarinPal reconcile verifies PAID transaction',async()=>{
  const calls:string[]=[];
  globalThis.fetch=async(url:any)=>{calls.push(String(url));if(String(url).endsWith('/inquiry.json'))return response({data:{status:'PAID',code:100},errors:[]});return response({data:{code:100,ref_id:77},errors:[]});};
  const r=await provider().reconcile({payment_id:'p2',amount_toman:50000,authority:'S2'});
  assert.equal(r.status,'paid');assert.equal(r.reference,'77');assert.equal(r.authority,'S2');assert.equal(calls.length,2);
});

test('ZarinPal reconcile can recover authority from unVerified callback identity',async()=>{
  globalThis.fetch=async(url:any)=>{
    const u=String(url);
    if(u.endsWith('/unVerified.json'))return response({data:{code:100,authorities:[{authority:'SRECOVER',amount:70000,callback_url:'https://x/payments/payment-7/callback?state=abc'}]},errors:[]});
    if(u.endsWith('/inquiry.json'))return response({data:{status:'PAID',code:100},errors:[]});
    return response({data:{code:100,ref_id:7007},errors:[]});
  };
  const r=await provider().reconcile({payment_id:'payment-7',amount_toman:70000,authority:null});
  assert.equal(r.status,'paid');assert.equal(r.authority,'SRECOVER');assert.equal(r.reference,'7007');
});

test('ZarinPal partial refund fails closed without provider call',async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return response({data:{code:100}});};
  const r=await provider({ZARINPAL_REVERSE_ENABLED:true}).refund({payment_reference:'123',authority:'S3',amount_toman:10000,payment_amount_toman:20000,refund_id:'r1'});
  assert.equal(r.status,'failed');assert.equal(r.code,'ZARINPAL_PARTIAL_REFUND_UNSUPPORTED');assert.equal(calls,0);
});

test('ZarinPal full reverse succeeds and reconcile detects REVERSED',async()=>{
  globalThis.fetch=async(url:any)=>String(url).endsWith('/reverse.json')?response({data:{code:100,message:'Reversed'},errors:[]}):response({data:{status:'REVERSED',code:100},errors:[]});
  const p=provider({ZARINPAL_REVERSE_ENABLED:true});
  const r=await p.refund({payment_reference:'123',authority:'S4',amount_toman:20000,payment_amount_toman:20000,refund_id:'r2'});
  assert.equal(r.status,'succeeded');assert.equal(r.reference,'reverse:S4');
  const q=await p.reconcileRefund!({refund_id:'r2',payment_reference:'123',refund_reference:r.reference,authority:'S4',amount_toman:20000,payment_amount_toman:20000});
  assert.equal(q.status,'succeeded');assert.equal(q.reference,'reverse:S4');
});


test('ZarinPal reverse remains disabled until operator explicitly enables it',async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return response({data:{code:100}});};
  const r=await provider().refund({payment_reference:'123',authority:'S5',amount_toman:20000,payment_amount_toman:20000,refund_id:'r3'});
  assert.equal(r.status,'failed');assert.equal(r.code,'ZARINPAL_REVERSE_DISABLED');assert.equal(calls,0);
});

test('ZarinPal webhook is fail-closed because integration uses callback and reconciliation',async()=>{
  await assert.rejects(()=>provider().parseWebhook({headers:{},body:{},raw_body:Buffer.from('{}')}),e=>e instanceof DomainError&&e.code==='PAYMENT_WEBHOOK_UNSUPPORTED');
});
