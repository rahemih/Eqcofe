import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PaymentAuxCommandInput,PaymentAuxInquiryInput,PaymentAuxObservation,PaymentAuxObservationOutcome } from '../domain/payment-aux-provider';
import { ProviderConfigurationService } from './provider-configuration.service';
import { ProviderHttpClient } from '../infrastructure/provider-http-client';

type Obj=Record<string,unknown>;

@Injectable()
export class PaymentAuxProviderService{
  constructor(private readonly configurations:ProviderConfigurationService,private readonly http:ProviderHttpClient){}

  async inquire(providerKey:string,input:PaymentAuxInquiryInput):Promise<PaymentAuxObservation>{
    const reference=this.reference(input?.reference);
    const {configuration,secret}=await this.configurations.require(providerKey);
    this.assertProvider(configuration.kind,configuration.baseUrl,secret);
    const path=String(configuration.config.inquiry_path??'/inquiry/{reference}').trim();
    if(!path.startsWith('/')||path.startsWith('//')||!path.includes('{reference}'))throw new DomainError('PAYMENT_AUX_INQUIRY_PATH_INVALID','مسیر استعلام سرویس کمکی پرداخت معتبر نیست.');
    const url=new URL(path.replace('{reference}',encodeURIComponent(reference)),configuration.baseUrl!).toString();
    const result=await this.http.execute({providerKey,url,method:'GET',headers:{accept:'application/json',authorization:`Bearer ${secret}`},context:{requestId:`payment-aux-inquiry-${reference}`,operation:'read',timeoutMs:configuration.timeoutMs},maxAttempts:configuration.retryMaxAttempts,circuitBreaker:{failureThreshold:3,openMs:30_000,halfOpenMaxCalls:1}});
    if(!result.ok)throw new DomainError('PAYMENT_AUX_PROVIDER_UNAVAILABLE','استعلام سرویس کمکی پرداخت در دسترس نیست.',{kind:result.failure.kind,code:result.failure.code});
    return this.parse(providerKey,this.safeJson(result.value.text),reference);
  }

  async command(providerKey:string,input:PaymentAuxCommandInput):Promise<PaymentAuxObservation>{
    const reference=this.reference(input?.reference),action=String(input?.action??'').trim().toLowerCase(),idempotencyKey=String(input?.idempotencyKey??'').trim();
    if(!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(action))throw new DomainError('PAYMENT_AUX_ACTION_INVALID','عملیات سرویس کمکی پرداخت معتبر نیست.');
    if(idempotencyKey.length<8||idempotencyKey.length>200)throw new DomainError('PAYMENT_AUX_IDEMPOTENCY_REQUIRED','کلید Idempotency معتبر الزامی است.');
    const {configuration,secret}=await this.configurations.require(providerKey);
    this.assertProvider(configuration.kind,configuration.baseUrl,secret);
    const path=String(configuration.config.command_path??'/actions/{action}').trim();
    if(!path.startsWith('/')||path.startsWith('//')||!path.includes('{action}'))throw new DomainError('PAYMENT_AUX_COMMAND_PATH_INVALID','مسیر عملیات سرویس کمکی پرداخت معتبر نیست.');
    const url=new URL(path.replace('{action}',encodeURIComponent(action)),configuration.baseUrl!).toString();
    const result=await this.http.execute({providerKey,url,method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${secret}`},body:JSON.stringify({reference,payload:input.payload??{},idempotency_key:idempotencyKey}),context:{requestId:`payment-aux-command-${reference}`,operation:'write',idempotencyKey,timeoutMs:configuration.timeoutMs},maxAttempts:configuration.retryMaxAttempts,circuitBreaker:{failureThreshold:3,openMs:30_000,halfOpenMaxCalls:1}});
    if(!result.ok)throw new DomainError('PAYMENT_AUX_PROVIDER_UNAVAILABLE','عملیات سرویس کمکی پرداخت در دسترس نیست.',{kind:result.failure.kind,code:result.failure.code});
    return this.parse(providerKey,this.safeJson(result.value.text),reference);
  }

  private assertProvider(kind:string,baseUrl:string|null,secret:string|null):void{
    if(kind!=='payment_aux')throw new DomainError('PAYMENT_AUX_PROVIDER_KIND_MISMATCH','Provider انتخاب‌شده از نوع سرویس کمکی پرداخت نیست.');
    if(!baseUrl)throw new DomainError('PAYMENT_AUX_PROVIDER_BASE_URL_REQUIRED','آدرس سرویس کمکی پرداخت پیکربندی نشده است.');
    if(!secret)throw new DomainError('PAYMENT_AUX_PROVIDER_SECRET_REQUIRED','Secret سرویس کمکی پرداخت در دسترس نیست.');
  }

  private reference(value:unknown):string{const v=String(value??'').trim();if(!v||v.length>200)throw new DomainError('PAYMENT_AUX_REFERENCE_INVALID','شناسه مرجع سرویس کمکی پرداخت معتبر نیست.');return v;}
  private parse(providerKey:string,value:Obj,fallbackReference:string):PaymentAuxObservation{
    const status=String(value.status??value.state??'unknown').trim();
    if(!status||status.length>100)throw new DomainError('PAYMENT_AUX_PROVIDER_RESPONSE_INVALID','پاسخ سرویس کمکی پرداخت معتبر نیست.');
    const observedAt=new Date(String(value.observed_at??value.observedAt??value.updated_at??value.updatedAt??new Date().toISOString()));
    if(Number.isNaN(observedAt.getTime())||observedAt.getTime()>Date.now()+5*60_000)throw new DomainError('PAYMENT_AUX_PROVIDER_RESPONSE_INVALID','زمان مشاهده سرویس کمکی پرداخت معتبر نیست.');
    const external=value.reference??value.external_reference??value.externalReference??fallbackReference;
    const payload=(value.payload&&typeof value.payload==='object'&&!Array.isArray(value.payload)?value.payload:value) as Obj;
    return{providerKey,externalReference:external==null?null:String(external),providerStatus:status,outcome:this.outcome(status),observedAt,payload};
  }
  private outcome(status:string):PaymentAuxObservationOutcome{const s=status.toLowerCase().replace(/[\s-]+/g,'_');if(['accepted','ok','success','succeeded'].includes(s))return'accepted';if(['rejected','failed','declined'].includes(s))return'rejected';if(['pending','processing','queued'].includes(s))return'pending';return'unknown';}
  private safeJson(text:string):Obj{try{const v=JSON.parse(text);if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('shape');return v as Obj;}catch{throw new DomainError('PAYMENT_AUX_PROVIDER_RESPONSE_INVALID','پاسخ سرویس کمکی پرداخت JSON معتبر نیست.');}}
}
