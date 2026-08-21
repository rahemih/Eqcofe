import { Injectable } from '@nestjs/common';
import { createHmac,timingSafeEqual } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { ProviderConfigurationService } from './provider-configuration.service';
import { ProviderHttpClient } from '../infrastructure/provider-http-client';

export type NormalizedShippingStatus='ready'|'handed_over'|'in_transit'|'delivered'|'delivery_failed'|'returned'|'unknown';
export interface ShippingTrackingObservation{externalEventId?:string|null;trackingNumber:string;providerStatus:string;normalizedStatus:NormalizedShippingStatus;occurredAt:Date;payload:Record<string,unknown>}

type Obj=Record<string,unknown>;

@Injectable()
export class ShippingProviderService{
  constructor(private readonly configurations:ProviderConfigurationService,private readonly http:ProviderHttpClient){}

  async refresh(providerKey:string,trackingNumber:string):Promise<ShippingTrackingObservation[]>{
    const tracking=String(trackingNumber??'').trim();if(!tracking||tracking.length>200)throw new DomainError('VALIDATION_ERROR','کد رهگیری معتبر نیست.');
    const {configuration,secret}=await this.configurations.require(providerKey);
    if(configuration.kind!=='shipping')throw new DomainError('SHIPPING_PROVIDER_KIND_MISMATCH','Provider انتخاب‌شده از نوع حمل نیست.');
    if(!configuration.baseUrl)throw new DomainError('SHIPPING_PROVIDER_BASE_URL_REQUIRED','آدرس سرویس حمل پیکربندی نشده است.');
    if(!secret)throw new DomainError('SHIPPING_PROVIDER_SECRET_REQUIRED','Secret سرویس حمل در دسترس نیست.');
    const path=String(configuration.config.tracking_path??'/tracking/{tracking}').trim();if(!path.startsWith('/')||path.startsWith('//')||!path.includes('{tracking}'))throw new DomainError('SHIPPING_PROVIDER_TRACKING_PATH_INVALID','مسیر رهگیری Provider معتبر نیست.');
    const url=new URL(path.replace('{tracking}',encodeURIComponent(tracking)),configuration.baseUrl).toString();
    const result=await this.http.execute({providerKey,url,method:'GET',headers:{accept:'application/json',authorization:`Bearer ${secret}`},context:{requestId:`shipping-refresh-${tracking}`,operation:'read',timeoutMs:configuration.timeoutMs},maxAttempts:configuration.retryMaxAttempts,circuitBreaker:{failureThreshold:3,openMs:30_000,halfOpenMaxCalls:1}});
    if(!result.ok)throw new DomainError('SHIPPING_PROVIDER_UNAVAILABLE','دریافت وضعیت حمل از Provider ممکن نشد.',{kind:result.failure.kind,code:result.failure.code});
    const body=this.safeJson(result.value.text),rows=Array.isArray(body.events)?body.events:Array.isArray(body.history)?body.history:[body];
    return rows.map(x=>this.parseUpdate(x,tracking)).sort((a,b)=>a.occurredAt.getTime()-b.occurredAt.getTime());
  }

  async parseWebhook(providerKey:string,input:{headers:Record<string,string|string[]|undefined>;body:unknown;rawBody:Buffer}):Promise<ShippingTrackingObservation>{
    const {configuration,secret}=await this.configurations.require(providerKey);
    if(configuration.kind!=='shipping')throw new DomainError('SHIPPING_PROVIDER_KIND_MISMATCH','Provider انتخاب‌شده از نوع حمل نیست.');
    if(!secret)throw new DomainError('SHIPPING_PROVIDER_SECRET_REQUIRED','Secret سرویس حمل در دسترس نیست.');
    if(!input.rawBody?.length)throw new DomainError('SHIPPING_WEBHOOK_RAW_BODY_REQUIRED','Raw body برای Webhook حمل الزامی است.');
    const signatureHeader=String(configuration.config.webhook_signature_header??'x-eqcofe-signature').trim().toLowerCase();
    const timestampHeader=String(configuration.config.webhook_timestamp_header??'x-eqcofe-timestamp').trim().toLowerCase();
    const allowedSkew=Number(configuration.config.webhook_allowed_clock_skew_seconds??300);
    if(!/^[a-z0-9-]+$/.test(signatureHeader)||!/^[a-z0-9-]+$/.test(timestampHeader)||!Number.isInteger(allowedSkew)||allowedSkew<30||allowedSkew>1800)throw new DomainError('SHIPPING_WEBHOOK_CONFIG_INVALID','پیکربندی Webhook حمل معتبر نیست.');
    const rawSig=input.headers[signatureHeader],rawTs=input.headers[timestampHeader],sig=Array.isArray(rawSig)?rawSig[0]:rawSig,ts=Array.isArray(rawTs)?rawTs[0]:rawTs;
    if(!sig||!ts)throw new DomainError('SHIPPING_WEBHOOK_SIGNATURE_INVALID','امضای Webhook حمل ارسال نشده است.');
    const epoch=Number(ts);if(!Number.isFinite(epoch)||Math.abs(Math.floor(Date.now()/1000)-epoch)>allowedSkew)throw new DomainError('SHIPPING_WEBHOOK_TIMESTAMP_INVALID','زمان Webhook حمل خارج از بازه مجاز است.');
    const expected=createHmac('sha256',secret).update(`${ts}.`).update(input.rawBody).digest('hex'),provided=String(sig).replace(/^sha256=/i,'').trim().toLowerCase();
    const a=Buffer.from(expected,'hex'),b=/^[0-9a-f]{64}$/.test(provided)?Buffer.from(provided,'hex'):Buffer.alloc(0);if(a.length!==b.length||!timingSafeEqual(a,b))throw new DomainError('SHIPPING_WEBHOOK_SIGNATURE_INVALID','امضای Webhook حمل معتبر نیست.');
    return this.parseUpdate(input.body);
  }

  private parseUpdate(x:unknown,fallbackTracking?:string):ShippingTrackingObservation{
    const o=this.obj(x),tracking=String(o.tracking_number??o.trackingNumber??fallbackTracking??'').trim(),status=String(o.status??o.state??'').trim(),occurred=new Date(String(o.occurred_at??o.occurredAt??o.updated_at??o.updatedAt??new Date().toISOString()));
    if(!tracking||tracking.length>200||!status||status.length>100||Number.isNaN(occurred.getTime())||occurred.getTime()>Date.now()+5*60_000)throw new DomainError('SHIPPING_PROVIDER_RESPONSE_INVALID','وضعیت رهگیری سرویس حمل معتبر نیست.');
    const payload=(o.payload&&typeof o.payload==='object'&&!Array.isArray(o.payload)?o.payload:o) as Obj,event=o.event_id??o.eventId??o.id??null;
    return{externalEventId:event==null?null:String(event),trackingNumber:tracking,providerStatus:status,normalizedStatus:this.normalize(status),occurredAt:occurred,payload};
  }
  private normalize(v:unknown):NormalizedShippingStatus{const s=String(v??'').trim().toLowerCase().replace(/[\s-]+/g,'_'),map:Record<string,NormalizedShippingStatus>={ready:'ready',prepared:'ready',handed_over:'handed_over',accepted:'handed_over',picked_up:'handed_over',in_transit:'in_transit',transit:'in_transit',out_for_delivery:'in_transit',delivered:'delivered',delivery_failed:'delivery_failed',failed:'delivery_failed',undelivered:'delivery_failed',returned:'returned',return_to_sender:'returned'};return map[s]??'unknown';}
  private obj(x:unknown):Obj{if(!x||typeof x!=='object'||Array.isArray(x))throw new DomainError('SHIPPING_PROVIDER_RESPONSE_INVALID','پاسخ سرویس حمل معتبر نیست.');return x as Obj;}
  private safeJson(text:string):Obj{try{return this.obj(JSON.parse(text));}catch(e){if(e instanceof DomainError)throw e;throw new DomainError('SHIPPING_PROVIDER_RESPONSE_INVALID','پاسخ سرویس حمل JSON معتبر نیست.');}}
}
