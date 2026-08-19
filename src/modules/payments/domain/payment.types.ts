import type {Buffer} from 'node:buffer';
export type PaymentStatus='initiating'|'pending'|'paid'|'failed'|'cancelled'|'unknown'|'late_received'|'refund_required'|'refunded';
export type ProviderPaymentStatus='paid'|'failed'|'pending'|'unknown';
export interface ProviderInitiateResult{authority:string;redirect_url:string;expires_at?:string|null;}
export interface ProviderVerifyResult{status:ProviderPaymentStatus;reference?:string|null;code?:string|null;amount_toman?:number|null;}
export interface PaymentProvider{
 readonly key:string;
 initiate(input:{payment_id:string;order_number:string;amount_toman:number;callback_url:string}):Promise<ProviderInitiateResult>;
 verify(input:{authority:string;amount_toman:number}):Promise<ProviderVerifyResult>;
 reconcile(input:{payment_id:string;amount_toman:number;authority?:string|null}):Promise<ProviderVerifyResult & {authority?:string|null;redirect_url?:string|null;expires_at?:string|null}>;
 parseWebhook(input:{headers:Record<string,string|string[]|undefined>;body:unknown;raw_body:Buffer}):Promise<{external_event_id:string;authority:string}>;
 refund(input:{payment_reference:string;amount_toman:number;refund_id:string;authority?:string|null;payment_amount_toman?:number|null}):Promise<{status:'succeeded'|'failed'|'unknown';reference?:string|null;code?:string|null}>;
 reconcileRefund?(input:{refund_id:string;payment_reference:string;refund_reference?:string|null;amount_toman:number;authority?:string|null;payment_amount_toman?:number|null}):Promise<{status:'succeeded'|'failed'|'unknown';reference?:string|null;code?:string|null}>;
}
export interface PaymentProviderRegistry{resolve(key:string):PaymentProvider;active():PaymentProvider;}
export const PAYMENT_PROVIDER_REGISTRY=Symbol('PAYMENT_PROVIDER_REGISTRY');
