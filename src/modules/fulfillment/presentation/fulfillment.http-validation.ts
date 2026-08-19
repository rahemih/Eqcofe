import { DomainError } from '../../../shared/errors/domain-error';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function obj(v:unknown,name='بدنه درخواست'):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new DomainError('VALIDATION_ERROR',`${name} معتبر نیست.`);return v as Record<string,unknown>;}
function keys(o:Record<string,unknown>,allowed:string[]){for(const k of Object.keys(o))if(!allowed.includes(k))throw new DomainError('VALIDATION_ERROR',`فیلد ناشناخته ${k} مجاز نیست.`);}
export function entityId(v:unknown){const s=String(v??'');if(!UUID.test(s))throw new DomainError('VALIDATION_ERROR','شناسه معتبر نیست.');return s;}
function qty(v:unknown){const n=Number(v);if(!Number.isInteger(n)||n<=0)throw new DomainError('VALIDATION_ERROR','تعداد باید عدد صحیح مثبت باشد.');return n;}
function nullableText(v:unknown,max:number){if(v===undefined||v===null)return v==null?null:undefined;const s=String(v);if(!s.trim()||s.length>max)throw new DomainError('VALIDATION_ERROR','متن واردشده معتبر نیست.');return s.trim();}

export function allocateBody(v:unknown){
  const o=obj(v);keys(o,['strategy','allocations']);const strategy=String(o.strategy??'');
  if(!['single_warehouse_preferred','manual'].includes(strategy))throw new DomainError('VALIDATION_ERROR','راهبرد تخصیص معتبر نیست.');
  if(o.allocations!==undefined&&!Array.isArray(o.allocations))throw new DomainError('VALIDATION_ERROR','لیست تخصیص معتبر نیست.');
  const allocations=(o.allocations as unknown[]|undefined)?.map(x=>{const a=obj(x,'ردیف تخصیص');keys(a,['order_item_id','warehouse_id','quantity']);return{order_item_id:entityId(a.order_item_id),warehouse_id:entityId(a.warehouse_id),quantity:qty(a.quantity)};});
  return{strategy:strategy as 'single_warehouse_preferred'|'manual',allocations};
}
export function preparationBody(v:unknown){
  const o=v===undefined?{}:obj(v);keys(o,['note']);return{note:nullableText(o.note,2000)};
}
export function pickBody(v:unknown){
  const o=obj(v);keys(o,['picked_quantity','note']);return{picked_quantity:qty(o.picked_quantity),note:nullableText(o.note,1000)};
}
export function unpickBody(v:unknown){
  const o=obj(v);keys(o,['quantity','reason']);const reason=String(o.reason??'').trim();if(!reason||reason.length>2000)throw new DomainError('VALIDATION_ERROR','دلیل Unpick معتبر نیست.');return{quantity:qty(o.quantity),reason};
}
export function shipmentBody(v:unknown){
  const o=obj(v);keys(o,['order_id','warehouse_id','carrier_provider_id','shipping_method','items']);
  const method=String(o.shipping_method??'').trim();if(!method||method.length>80)throw new DomainError('VALIDATION_ERROR','روش ارسال معتبر نیست.');
  if(!Array.isArray(o.items)||o.items.length<1)throw new DomainError('VALIDATION_ERROR','حداقل یک قلم مرسوله الزامی است.');
  const items=o.items.map(x=>{const a=obj(x,'قلم مرسوله');keys(a,['order_item_id','quantity']);return{order_item_id:entityId(a.order_item_id),quantity:qty(a.quantity)};});
  return{order_id:entityId(o.order_id),warehouse_id:entityId(o.warehouse_id),carrier_provider_id:o.carrier_provider_id==null?null:entityId(o.carrier_provider_id),shipping_method:method,items};
}
export function cancelBody(v:unknown){
  const o=obj(v);keys(o,['reason']);const reason=String(o.reason??'').trim();if(reason.length<2||reason.length>2000)throw new DomainError('VALIDATION_ERROR','دلیل لغو معتبر نیست.');return{reason};
}
