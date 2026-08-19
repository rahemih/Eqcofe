import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {DomainError} from '../../../shared/errors/domain-error';
import {PaymentProvider,ProviderInitiateResult,ProviderVerifyResult} from '../domain/payment.types';

type ZarinpalEnvelope={data?:Record<string,unknown>;errors?:unknown;message?:unknown};

@Injectable()
export class ZarinpalPaymentProvider implements PaymentProvider{
  readonly key='zarinpal';
  constructor(private readonly config:ConfigService){}

  private merchant():string{
    const value=String(this.config.get<string>('ZARINPAL_MERCHANT_ID','')).trim();
    if(!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value))throw new DomainError('PAYMENT_PROVIDER_UNAVAILABLE','شناسه پذیرنده زرین‌پال پیکربندی نشده است.');
    return value;
  }
  private sandbox():boolean{return this.config.get<boolean>('ZARINPAL_SANDBOX',false);}
  private base():string{return this.sandbox()?'https://sandbox.zarinpal.com':'https://payment.zarinpal.com';}
  private timeoutMs():number{return Number(this.config.get<number>('ZARINPAL_TIMEOUT_MS',10000));}
  private errorCode(x:unknown):string|null{
    if(typeof x==='object'&&x){const o=x as Record<string,unknown>;if(typeof o.code==='number'||typeof o.code==='string')return String(o.code);const errors=o.errors;if(typeof errors==='object'&&errors){const e=errors as Record<string,unknown>;if(typeof e.code==='number'||typeof e.code==='string')return String(e.code);}}
    return null;
  }
  private async post(path:string,body:Record<string,unknown>):Promise<ZarinpalEnvelope>{
    let response:Response;
    try{
      response=await fetch(`${this.base()}${path}`,{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(this.timeoutMs())});
    }catch{
      throw new DomainError('PAYMENT_PROVIDER_UNAVAILABLE','ارتباط با زرین‌پال برقرار نشد.');
    }
    let payload:ZarinpalEnvelope;
    try{payload=await response.json() as ZarinpalEnvelope;}catch{throw new DomainError('PAYMENT_PROVIDER_RESPONSE_INVALID','پاسخ زرین‌پال معتبر نیست.');}
    if(!response.ok)throw new DomainError('PAYMENT_PROVIDER_REJECTED','زرین‌پال درخواست را نپذیرفت.',{provider_code:this.errorCode(payload)});
    return payload;
  }
  private data(payload:ZarinpalEnvelope):Record<string,unknown>{return typeof payload.data==='object'&&payload.data?payload.data:{};}

  async initiate(input:{payment_id:string;order_number:string;amount_toman:number;callback_url:string}):Promise<ProviderInitiateResult>{
    const payload=await this.post('/pg/v4/payment/request.json',{
      merchant_id:this.merchant(),amount:input.amount_toman,currency:'IRT',description:`EQCOFE order ${input.order_number}`,callback_url:input.callback_url,
      metadata:{order_id:input.order_number,auto_verify:false},
    });
    const d=this.data(payload),code=Number(d.code),authority=String(d.authority??'');
    if(code!==100||!authority)throw new DomainError('PAYMENT_PROVIDER_REJECTED','زرین‌پال ایجاد پرداخت را نپذیرفت.',{provider_code:Number.isFinite(code)?String(code):this.errorCode(payload)});
    return{authority,redirect_url:`${this.base()}/pg/StartPay/${encodeURIComponent(authority)}`};
  }

  async verify(input:{authority:string;amount_toman:number}):Promise<ProviderVerifyResult>{
    const payload=await this.post('/pg/v4/payment/verify.json',{merchant_id:this.merchant(),amount:input.amount_toman,currency:'IRT',authority:input.authority});
    const d=this.data(payload),code=Number(d.code),ref=d.ref_id==null?null:String(d.ref_id);
    if(code===100||code===101)return{status:'paid',reference:ref,code:String(code),amount_toman:input.amount_toman};
    return{status:'failed',code:Number.isFinite(code)?String(code):this.errorCode(payload),amount_toman:input.amount_toman};
  }

  private async inquiry(authority:string):Promise<{status:string;code:string|null}>{
    const payload=await this.post('/pg/v4/payment/inquiry.json',{merchant_id:this.merchant(),authority});
    const d=this.data(payload);return{status:String(d.status??'UNKNOWN').toUpperCase(),code:d.code==null?this.errorCode(payload):String(d.code)};
  }

  async reconcile(input:{payment_id:string;amount_toman:number;authority?:string|null}):Promise<ProviderVerifyResult&{authority?:string|null;redirect_url?:string|null;expires_at?:string|null}>{
    let authority=input.authority??null;
    if(!authority){
      const payload=await this.post('/pg/v4/payment/unVerified.json',{merchant_id:this.merchant()});
      const d=this.data(payload),items=Array.isArray(d.authorities)?d.authorities:[];
      const match=items.find(x=>{if(!x||typeof x!=='object')return false;const r=x as Record<string,unknown>;return Number(r.amount)===input.amount_toman&&String(r.callback_url??'').includes(`/payments/${input.payment_id}/callback`);}) as Record<string,unknown>|undefined;
      authority=match?.authority?String(match.authority):null;
      if(!authority)return{status:'unknown',code:'ZARINPAL_AUTHORITY_NOT_RECOVERED',amount_toman:input.amount_toman};
    }
    const inquiry=await this.inquiry(authority);
    if(inquiry.status==='PAID'||inquiry.status==='VERIFIED')return{...(await this.verify({authority,amount_toman:input.amount_toman})),authority};
    if(inquiry.status==='IN_BANK')return{status:'pending',code:inquiry.code,amount_toman:input.amount_toman,authority};
    if(inquiry.status==='FAILED'||inquiry.status==='REVERSED')return{status:'failed',code:inquiry.status,amount_toman:input.amount_toman,authority};
    return{status:'unknown',code:inquiry.status||inquiry.code,amount_toman:input.amount_toman,authority};
  }

  async parseWebhook(input:{raw_body:Buffer}):Promise<never>{
    if(!input.raw_body?.length)throw new DomainError('PAYMENT_WEBHOOK_RAW_BODY_REQUIRED','Raw body برای Webhook پرداخت الزامی است.');
    throw new DomainError('PAYMENT_WEBHOOK_UNSUPPORTED','زرین‌پال در Integration فعلی EQCOFE از Webhook استفاده نمی‌کند؛ Callback و Reconciliation مسیر معتبر هستند.');
  }

  async refund(input:{payment_reference:string;amount_toman:number;refund_id:string;authority?:string|null;payment_amount_toman?:number|null}):Promise<{status:'succeeded'|'failed'|'unknown';reference?:string|null;code?:string|null}>{
    if(!this.config.get<boolean>('ZARINPAL_REVERSE_ENABLED',false))return{status:'failed',code:'ZARINPAL_REVERSE_DISABLED'};
    if(!input.authority)return{status:'failed',code:'ZARINPAL_REVERSE_AUTHORITY_REQUIRED'};
    if(input.payment_amount_toman==null||input.amount_toman!==input.payment_amount_toman)return{status:'failed',code:'ZARINPAL_PARTIAL_REFUND_UNSUPPORTED'};
    try{
      const payload=await this.post('/pg/v4/payment/reverse.json',{merchant_id:this.merchant(),authority:input.authority});
      const d=this.data(payload),code=Number(d.code);
      if(code===100)return{status:'succeeded',reference:`reverse:${input.authority}`,code:'100'};
      return{status:'failed',code:Number.isFinite(code)?String(code):this.errorCode(payload)};
    }catch(e){
      if(e instanceof DomainError&&['PAYMENT_PROVIDER_REJECTED','PAYMENT_PROVIDER_RESPONSE_INVALID','PAYMENT_PROVIDER_UNAVAILABLE'].includes(e.code))return{status:'unknown',code:e.code};
      throw e;
    }
  }

  async reconcileRefund(input:{refund_id:string;payment_reference:string;refund_reference?:string|null;amount_toman:number;authority?:string|null;payment_amount_toman?:number|null}):Promise<{status:'succeeded'|'failed'|'unknown';reference?:string|null;code?:string|null}>{
    if(!input.authority)return{status:'unknown',code:'ZARINPAL_REVERSE_AUTHORITY_REQUIRED'};
    const inquiry=await this.inquiry(input.authority);
    if(inquiry.status==='REVERSED')return{status:'succeeded',reference:input.refund_reference??`reverse:${input.authority}`,code:inquiry.code};
    if(['VERIFIED','PAID','IN_BANK','FAILED'].includes(inquiry.status))return{status:'failed',code:`ZARINPAL_NOT_REVERSED_${inquiry.status}`};
    return{status:'unknown',code:inquiry.status||inquiry.code};
  }
}
