import { Injectable } from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { ConfigurationRepository } from '../infrastructure/configuration.repository';import { StoreConfigurationPort } from './ports/store-configuration.port';import { definition } from '../domain/configuration.registry';
@Injectable() export class StoreConfigurationService implements StoreConfigurationPort{constructor(private readonly repo:ConfigurationRepository,private readonly env:ConfigService){}
 async get<T=unknown>(key:string,scopeType='global',scopeId:string|null=null):Promise<T>{definition(key);const r=await this.repo.key(key,scopeType,scopeId);if(!r&&scopeType!=='global')return this.get<T>(key);if(!r)throw new Error('CONFIGURATION_KEY_NOT_FOUND');return r.resolved_value as T;}
 async getNumber(key:string,fallback:number){try{const v=Number(await this.get(key));return Number.isFinite(v)?v:fallback;}catch{return fallback;}}
 async getBoolean(key:string,fallback:boolean){try{const v=await this.get(key);return typeof v==='boolean'?v:fallback;}catch{return fallback;}}
 async numberWithEnvFallback(key:string,envKey:string,fallback:number){const configured=await this.getNumber(key,Number(this.env.get<string>(envKey,String(fallback)))||fallback);return configured;}
}
