import { DomainError } from '../../../shared/errors/domain-error';
import { IntegrationProviderKind } from './provider-contracts';

export interface ProviderConfiguration {
  key: string;
  kind: IntegrationProviderKind;
  enabled: boolean;
  baseUrl: string | null;
  timeoutMs: number;
  retryMaxAttempts: number;
  secretRef: string | null;
  config: Record<string, unknown>;
}

const PROVIDER_KEY=/^[a-z0-9][a-z0-9_-]{1,63}$/;
const SECRET_REF=/^EQCOFE_[A-Z0-9_]{3,120}$/;
const SENSITIVE_KEY=/(secret|token|password|credential|authorization|api[_-]?key|private[_-]?key)/i;

export function assertNonSecretConfig(value:unknown,path='config'):void{
  if(value===null||value===undefined)return;
  if(Array.isArray(value)){value.forEach((v,i)=>assertNonSecretConfig(v,`${path}[${i}]`));return;}
  if(typeof value!=='object')return;
  for(const [key,child] of Object.entries(value as Record<string,unknown>)){
    if(SENSITIVE_KEY.test(key))throw new DomainError('INTEGRATION_SECRET_IN_CONFIG_FORBIDDEN',`مقدار محرمانه نباید در ${path}.${key} ذخیره شود.`);
    assertNonSecretConfig(child,`${path}.${key}`);
  }
}

export function validateProviderConfiguration(input:ProviderConfiguration):ProviderConfiguration{
  const key=String(input.key??'').trim();
  if(!PROVIDER_KEY.test(key))throw new DomainError('INTEGRATION_PROVIDER_KEY_INVALID','کلید Provider معتبر نیست.');
  if(!Number.isInteger(input.timeoutMs)||input.timeoutMs<100||input.timeoutMs>120000)throw new DomainError('INTEGRATION_TIMEOUT_INVALID','Timeout Provider معتبر نیست.');
  if(!Number.isInteger(input.retryMaxAttempts)||input.retryMaxAttempts<0||input.retryMaxAttempts>5)throw new DomainError('INTEGRATION_RETRY_LIMIT_INVALID','تعداد Retry Provider معتبر نیست.');
  const secretRef=input.secretRef?.trim()||null;
  if(secretRef&&!SECRET_REF.test(secretRef))throw new DomainError('INTEGRATION_SECRET_REF_INVALID','شناسه Secret باید یک نام محیطی EQCOFE_* باشد.');
  let baseUrl=input.baseUrl?.trim()||null;
  if(baseUrl){let u:URL;try{u=new URL(baseUrl);}catch{throw new DomainError('INTEGRATION_BASE_URL_INVALID','آدرس Provider معتبر نیست.');}if(u.protocol!=='https:'&&u.hostname!=='localhost'&&u.hostname!=='127.0.0.1')throw new DomainError('INTEGRATION_BASE_URL_INSECURE','Provider production باید HTTPS باشد.');baseUrl=u.toString().replace(/\/$/,'');}
  const config=input.config??{};
  assertNonSecretConfig(config);
  return {...input,key,baseUrl,secretRef,config};
}
