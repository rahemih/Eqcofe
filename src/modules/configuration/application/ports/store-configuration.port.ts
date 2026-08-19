export const STORE_CONFIGURATION_PORT=Symbol('STORE_CONFIGURATION_PORT');
export interface StoreConfigurationPort{
 get<T=unknown>(key:string,scopeType?:string,scopeId?:string|null):Promise<T>;
 getNumber(key:string,fallback:number):Promise<number>;
 getBoolean(key:string,fallback:boolean):Promise<boolean>;
}
