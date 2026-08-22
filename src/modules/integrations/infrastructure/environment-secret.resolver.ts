import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '../../../shared/errors/domain-error';

@Injectable()
export class EnvironmentSecretResolver {
  constructor(private readonly config:ConfigService){}

  resolve(reference:string|null):string|null {
    if(!reference)return null;
    if(!/^EQCOFE_[A-Z0-9_]{3,120}$/.test(reference))throw new DomainError('INTEGRATION_SECRET_REF_INVALID','شناسه Secret معتبر نیست.');
    const value=this.config.get<string>(reference);
    if(!value||!value.trim())throw new DomainError('INTEGRATION_SECRET_UNAVAILABLE','Secret مورد نیاز Provider در محیط در دسترس نیست.');
    return value;
  }
}
