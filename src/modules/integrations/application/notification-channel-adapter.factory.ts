import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotificationProviderPort, NotificationProviderMessage, NotificationProviderResult, OutboundNotificationChannel } from '../../notifications/application/ports/notification-provider.port';
import { ProviderConfigurationService } from './provider-configuration.service';
import { ProviderHttpClient } from '../infrastructure/provider-http-client';
import { ProviderFailure } from '../domain/provider-contracts';

interface AdapterConfig { sendPath:string; authHeader:string; authScheme:string; }

@Injectable()
export class NotificationChannelAdapterFactory {
  constructor(private readonly configurations: ProviderConfigurationService, private readonly http: ProviderHttpClient) {}
  create(providerKey:string,channel:OutboundNotificationChannel):NotificationProviderPort {const key=String(providerKey??'').trim();if(!key)throw new DomainError('INTEGRATION_PROVIDER_KEY_REQUIRED','کلید Provider الزامی است.');return{key,channel,send:(message)=>this.send(key,channel,message)};}
  private async send(providerKey:string,channel:OutboundNotificationChannel,message:NotificationProviderMessage):Promise<NotificationProviderResult>{
    if(message.channel!==channel)return{status:'permanent_failure',errorCode:'NOTIFICATION_PROVIDER_CHANNEL_MISMATCH'};
    const {configuration,secret}=await this.configurations.require(providerKey);
    if(configuration.kind!==channel)return{status:'blocked',errorCode:'NOTIFICATION_PROVIDER_KIND_MISMATCH'};
    if(!configuration.baseUrl)return{status:'blocked',errorCode:'NOTIFICATION_PROVIDER_BASE_URL_REQUIRED'};
    if(!secret)return{status:'blocked',errorCode:'NOTIFICATION_PROVIDER_SECRET_REQUIRED'};
    const adapter=this.adapterConfig(configuration.config),url=new URL(adapter.sendPath,configuration.baseUrl).toString();
    const result=await this.http.execute({providerKey,url,method:'POST',headers:{'content-type':'application/json',[adapter.authHeader]:`${adapter.authScheme}${secret}`},body:JSON.stringify({to:message.destination,subject:channel==='email'?message.subject:null,body:message.body,idempotency_key:message.idempotencyKey}),context:{requestId:`notification-${message.deliveryId}`,operation:'write',idempotencyKey:message.idempotencyKey,timeoutMs:configuration.timeoutMs},maxAttempts:configuration.retryMaxAttempts,circuitBreaker:{failureThreshold:3,openMs:30_000,halfOpenMaxCalls:1}});
    if(!result.ok)return this.mapFailure(result.failure);
    const parsed=this.safeJson(result.value.text);return{status:'delivered',providerMessageId:this.messageId(parsed)??result.providerRequestId??undefined,metadata:{provider_request_id:result.providerRequestId??null}};
  }
  private adapterConfig(config:Record<string,unknown>):AdapterConfig{const sendPath=String(config.send_path??'/send').trim(),authHeader=String(config.auth_header??'authorization').trim().toLowerCase(),authScheme=String(config.auth_scheme??'Bearer ').trimEnd()+' ';if(!sendPath.startsWith('/')||sendPath.startsWith('//'))throw new DomainError('NOTIFICATION_PROVIDER_SEND_PATH_INVALID','مسیر ارسال Provider نامعتبر است.');if(!/^[a-z0-9-]+$/.test(authHeader))throw new DomainError('NOTIFICATION_PROVIDER_AUTH_HEADER_INVALID','هدر احراز هویت Provider نامعتبر است.');return{sendPath,authHeader,authScheme};}
  private mapFailure(failure:ProviderFailure):NotificationProviderResult{if(failure.kind==='authentication'||failure.kind==='authorization'||failure.kind==='invalid_request'||failure.kind==='not_found'||failure.kind==='conflict')return{status:'permanent_failure',errorCode:failure.code,errorMessage:failure.message,metadata:{provider_request_id:failure.providerRequestId??null}};return{status:'retryable_failure',errorCode:failure.code,errorMessage:failure.message,metadata:{provider_request_id:failure.providerRequestId??null,retry_after_ms:failure.retryAfterMs??null}};}
  private safeJson(text:string):Record<string,unknown>{try{const value=JSON.parse(text);return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return{};}}
  private messageId(value:Record<string,unknown>):string|null{for(const key of ['message_id','messageId','id']){const v=value[key];if(typeof v==='string'&&v.trim())return v.trim();}return null;}
}
