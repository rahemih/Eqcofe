import { DomainError } from '../../../shared/errors/domain-error';
export type ConfigurationValueType='boolean'|'integer'|'number'|'string'|'json';
export type ConfigurationRisk='low'|'medium'|'high'|'critical';
export interface ConfigurationDefinition{key:string;valueType:ConfigurationValueType;riskLevel:ConfigurationRisk;scopeable:boolean;min?:number;max?:number;}
export const CONFIGURATION_DEFINITIONS:Record<string,ConfigurationDefinition>={
 'commerce.cart_ttl_hours':{key:'commerce.cart_ttl_hours',valueType:'integer',riskLevel:'medium',scopeable:false,min:1,max:720},
 'commerce.checkout_ttl_minutes':{key:'commerce.checkout_ttl_minutes',valueType:'integer',riskLevel:'high',scopeable:false,min:1,max:120},
 'commerce.reservation_ttl_minutes':{key:'commerce.reservation_ttl_minutes',valueType:'integer',riskLevel:'high',scopeable:false,min:1,max:120},
 'commerce.cart_access_token_max_active':{key:'commerce.cart_access_token_max_active',valueType:'integer',riskLevel:'medium',scopeable:false,min:1,max:20},
 'orders.pending_ttl_minutes':{key:'orders.pending_ttl_minutes',valueType:'integer',riskLevel:'high',scopeable:false,min:1,max:1440},
 'orders.guest_access_ttl_days':{key:'orders.guest_access_ttl_days',valueType:'integer',riskLevel:'medium',scopeable:false,min:1,max:30},
 'inventory.low_stock_threshold':{key:'inventory.low_stock_threshold',valueType:'integer',riskLevel:'medium',scopeable:true,min:0,max:100000},
 'inventory.physical_store_reserve_percent':{key:'inventory.physical_store_reserve_percent',valueType:'number',riskLevel:'critical',scopeable:true,min:0,max:100},
 'catalog.out_of_stock_archive_days':{key:'catalog.out_of_stock_archive_days',valueType:'integer',riskLevel:'medium',scopeable:false,min:1,max:3650},
 'pricing.wholesale_quantity_discount_min_qty':{key:'pricing.wholesale_quantity_discount_min_qty',valueType:'integer',riskLevel:'high',scopeable:false,min:2,max:100000},
 'sales.global_sales_enabled':{key:'sales.global_sales_enabled',valueType:'boolean',riskLevel:'critical',scopeable:false},
 'content.public_base_url':{key:'content.public_base_url',valueType:'string',riskLevel:'medium',scopeable:false},
};
export function definition(key:string){const d=CONFIGURATION_DEFINITIONS[key];if(!d)throw new DomainError('CONFIGURATION_KEY_NOT_FOUND','کلید تنظیمات شناخته‌شده نیست.');return d;}
export function validateConfigurationValue(key:string,value:unknown){const d=definition(key);let v=value;if(d.valueType==='boolean'){if(typeof v!=='boolean')throw new DomainError('VALIDATION_ERROR','مقدار تنظیمات باید درست/نادرست باشد.');}
 else if(d.valueType==='integer'){if(typeof v!=='number'||!Number.isInteger(v))throw new DomainError('VALIDATION_ERROR','مقدار تنظیمات باید عدد صحیح باشد.');}
 else if(d.valueType==='number'){if(typeof v!=='number'||!Number.isFinite(v))throw new DomainError('VALIDATION_ERROR','مقدار عددی تنظیمات معتبر نیست.');}
 else if(d.valueType==='string'){if(typeof v!=='string'||!v.trim())throw new DomainError('VALIDATION_ERROR','مقدار متنی تنظیمات معتبر نیست.');v=v.trim();}
 if(typeof v==='number'&&((d.min!==undefined&&v<d.min)||(d.max!==undefined&&v>d.max)))throw new DomainError('CONFIGURATION_VALUE_OUT_OF_RANGE','مقدار تنظیمات خارج از بازه مجاز است.');return v;}
