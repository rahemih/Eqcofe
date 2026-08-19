import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac,timingSafeEqual } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { NormalizedShippingStatus,ShippingProviderPort,ShippingTrackingUpdate } from '../application/ports/shipping-provider.port';

type Obj=Record<string,unknown>;
@Injectable()
export class ConfiguredShippingProvider implements ShippingProviderPort{
  readonly key:string;
  constructor(private readonly config:ConfigService){this.key=String(this.config.get<string>('SHIPPING_PROVIDER_KEY','disabled')).trim().toLowerCase();}

  private timeoutMs(){return Number(this.config.get<number>('SHIPPING_PROVIDER_TIMEOUT_MS',10000));}
  private base(){const v=String(this.config.get<string>('SHIPPING_PROVIDER_BASE_URL','')).trim().replace(/\/+$/,'');if(!v)throw new DomainError('SHIPPING_PROVIDER_UNAVAILABLE','آدرس سرویس حمل پیکربندی نشده است.');return v;}
  private token(){const v=String(this.config.get<string>('SHIPPING_PROVIDER_API_TOKEN','')).trim();if(!v)throw new DomainError('SHIPPING_PROVIDER_UNAVAILABLE','توکن سرویس حمل پیکربندی نشده است.');return v;}
  private secret(){const v=String(this.config.get<string>('SHIPPING_WEBHOOK_HMAC_SECRET',''));if(v.length<32)throw new DomainError('SHIPPING_WEBHOOK_SIGNATURE_INVALID','کلید امضای Webhook حمل معتبر نیست.');return v;}
  private normalize(v:unknown):NormalizedShippingStatus{
    const s=String(v??'').trim().toLowerCase().replace(/[\s-]+/g,'_');
    const map:Record<string,NormalizedShippingStatus>={
      ready:'ready',prepared:'ready',
      handed_over:'handed_over',accepted:'handed_over',picked_up:'handed_over',
      in_transit:'in_transit',transit:'in_transit',out_for_delivery:'in_transit',
      delivered:'delivered',
      delivery_failed:'delivery_failed',failed:'delivery_failed',undelivered:'delivery_failed',
      returned:'returned',return_to_sender:'returned',
    };
    return map[s]??'unknown';
  }
  private obj(x:unknown):Obj{if(!x||typeof x!=='object'||Array.isArray(x))throw new DomainError('SHIPPING_PROVIDER_RESPONSE_INVALID','پاسخ سرویس حمل معتبر نیست.');return x as Obj;}
  private parseUpdate(x:unknown,fallbackTracking?:string):ShippingTrackingUpdate{
    const o=this.obj(x),tracking=String(o.tracking_number??o.trackingNumber??fallbackTracking??'').trim(),status=String(o.status??o.state??'').trim();
    const occurred=new Date(String(o.occurred_at??o.occurredAt??o.updated_at??o.updatedAt??new Date().toISOString()));
    if(!tracking||tracking.length>200||!status||status.length>100||Number.isNaN(occurred.getTime()))throw new DomainError('SHIPPING_PROVIDER_RESPONSE_INVALID','وضعیت رهگیری سرویس حمل معتبر نیست.');
    const payload=(o.payload&&typeof o.payload==='object'&&!Array.isArray(o.payload)?o.payload:o) as Obj;
    const event=o.event_id??o.eventId??o.id??null;
    return{externalEventId:event==null?null:String(event),trackingNumber:tracking,providerStatus:status,normalizedStatus:this.normalize(status),occurredAt:occurred,payload};
  }

  async refresh(input:{trackingNumber:string}):Promise<ShippingTrackingUpdate[]>{
    const tracking=String(input.trackingNumber??'').trim();if(!tracking)throw new DomainError('VALIDATION_ERROR','کد رهگیری الزامی است.');
    let response:Response;
    try{
      response=await fetch(`${this.base()}/tracking/${encodeURIComponent(tracking)}`,{
        method:'GET',headers:{accept:'application/json',authorization:`Bearer ${this.token()}`},signal:AbortSignal.timeout(this.timeoutMs())
      });
    }catch{throw new DomainError('SHIPPING_PROVIDER_UNAVAILABLE','ارتباط با سرویس حمل برقرار نشد.');}
    let body:unknown;try{body=await response.json();}catch{throw new DomainError('SHIPPING_PROVIDER_RESPONSE_INVALID','پاسخ سرویس حمل JSON معتبر نیست.');}
    if(!response.ok)throw new DomainError('SHIPPING_PROVIDER_REJECTED','سرویس حمل درخواست رهگیری را نپذیرفت.',{status:response.status});
    const o=this.obj(body),rows=Array.isArray(o.events)?o.events:Array.isArray(o.history)?o.history:[o];
    const updates=rows.map(x=>this.parseUpdate(x,tracking)).sort((a,b)=>a.occurredAt.getTime()-b.occurredAt.getTime());
    return updates;
  }

  async parseWebhook(input:{headers:Record<string,string|string[]|undefined>;body:unknown;rawBody:Buffer}):Promise<ShippingTrackingUpdate>{
    if(!this.config.get<boolean>('SHIPPING_WEBHOOK_ENABLED',false))throw new DomainError('SHIPPING_WEBHOOK_DISABLED','Webhook حمل غیرفعال است.');
    if(!input.rawBody?.length)throw new DomainError('SHIPPING_WEBHOOK_RAW_BODY_REQUIRED','Raw body برای Webhook حمل الزامی است.');
    const sigHeader=String(this.config.get<string>('SHIPPING_WEBHOOK_SIGNATURE_HEADER','x-eqcofe-signature')).toLowerCase();
    const tsHeader=String(this.config.get<string>('SHIPPING_WEBHOOK_TIMESTAMP_HEADER','x-eqcofe-timestamp')).toLowerCase();
    const rawSig=input.headers[sigHeader],rawTs=input.headers[tsHeader];
    const sig=Array.isArray(rawSig)?rawSig[0]:rawSig,ts=Array.isArray(rawTs)?rawTs[0]:rawTs;
    if(!sig||!ts)throw new DomainError('SHIPPING_WEBHOOK_SIGNATURE_INVALID','امضای Webhook حمل ارسال نشده است.');
    const epoch=Number(ts),skew=Number(this.config.get<number>('SHIPPING_WEBHOOK_ALLOWED_CLOCK_SKEW_SECONDS',300));
    if(!Number.isFinite(epoch)||Math.abs(Math.floor(Date.now()/1000)-epoch)>skew)throw new DomainError('SHIPPING_WEBHOOK_TIMESTAMP_INVALID','زمان Webhook حمل خارج از بازه مجاز است.');
    const expected=createHmac('sha256',this.secret()).update(`${ts}.`).update(input.rawBody).digest('hex');
    const provided=String(sig).replace(/^sha256=/i,'').trim().toLowerCase();
    const a=Buffer.from(expected,'hex'),b=/^[0-9a-f]{64}$/.test(provided)?Buffer.from(provided,'hex'):Buffer.alloc(0);
    if(a.length!==b.length||!timingSafeEqual(a,b))throw new DomainError('SHIPPING_WEBHOOK_SIGNATURE_INVALID','امضای Webhook حمل معتبر نیست.');
    return this.parseUpdate(input.body);
  }
}
