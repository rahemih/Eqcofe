const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const {ConfiguredShippingProvider}=require('../dist/src/modules/fulfillment/infrastructure/configured-shipping.provider.js');

class Cfg{
  constructor(v){this.v=v}
  get(k,d){return Object.prototype.hasOwnProperty.call(this.v,k)?this.v[k]:d}
}
(async()=>{
  const cfg=new Cfg({
    SHIPPING_PROVIDER_KEY:'generic_hmac',
    SHIPPING_WEBHOOK_ENABLED:true,
    SHIPPING_WEBHOOK_HMAC_SECRET:'s'.repeat(32),
    SHIPPING_WEBHOOK_SIGNATURE_HEADER:'x-eqcofe-signature',
    SHIPPING_WEBHOOK_TIMESTAMP_HEADER:'x-eqcofe-timestamp',
    SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS:300,
    SHIPPING_PROVIDER_BASE_URL:'https://carrier.example.test',
    SHIPPING_PROVIDER_API_TOKEN:'token',
    SHIPPING_PROVIDER_TIMEOUT_MS:5000,
  });
  const p=new ConfiguredShippingProvider(cfg);
  const raw=Buffer.from(JSON.stringify({event_id:'e1',tracking_number:'TRK1',status:'delivered',occurred_at:new Date().toISOString(),payload:{x:1}}));
  const ts=String(Math.floor(Date.now()/1000));
  const sig=createHmac('sha256','s'.repeat(32)).update(`${ts}.`).update(raw).digest('hex');
  const ok=await p.parseWebhook({headers:{'x-eqcofe-signature':sig,'x-eqcofe-timestamp':ts},body:JSON.parse(raw),rawBody:raw});
  assert.equal(ok.normalizedStatus,'delivered');
  assert.equal(ok.trackingNumber,'TRK1');

  let bad=false;
  try{await p.parseWebhook({headers:{'x-eqcofe-signature':'00'.repeat(32),'x-eqcofe-timestamp':ts},body:JSON.parse(raw),rawBody:raw});}catch(e){bad=e.code==='SHIPPING_WEBHOOK_SIGNATURE_INVALID'}
  assert.equal(bad,true);

  let stale=false;
  try{
    const old=String(Math.floor(Date.now()/1000)-1000);
    const oldSig=createHmac('sha256','s'.repeat(32)).update(`${old}.`).update(raw).digest('hex');
    await p.parseWebhook({headers:{'x-eqcofe-signature':oldSig,'x-eqcofe-timestamp':old},body:JSON.parse(raw),rawBody:raw});
  }catch(e){stale=e.code==='SHIPPING_WEBHOOK_TIMESTAMP_INVALID'}
  assert.equal(stale,true);

  const originalFetch=global.fetch;
  global.fetch=async(url,opts)=>{
    assert.equal(url,'https://carrier.example.test/tracking/TRK1');
    assert.equal(opts.headers.authorization,'Bearer token');
    return {ok:true,status:200,json:async()=>({events:[
      {event_id:'a',tracking_number:'TRK1',status:'in_transit',occurred_at:'2026-08-15T01:00:00Z',payload:{}},
      {event_id:'b',tracking_number:'TRK1',status:'delivered',occurred_at:'2026-08-15T02:00:00Z',payload:{}},
    ]})};
  };
  const updates=await p.refresh({trackingNumber:'TRK1'});
  global.fetch=originalFetch;
  assert.equal(updates.length,2);
  assert.equal(updates[0].normalizedStatus,'in_transit');
  assert.equal(updates[1].normalizedStatus,'delivered');
  console.log('A7 compiled provider runtime: 8/8 PASS');
})().catch(e=>{console.error(e);process.exit(1)});
