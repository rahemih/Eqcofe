import { DomainError } from '../../../shared/errors/domain-error';
export type ReceiptItemInput={purchase_order_item_id?:string|null;variant_id:string;received_quantity:number;accepted_quantity:number;quarantine_quantity:number;rejected_quantity:number;unit_cost_toman:number};
export function assertPositiveInt(value:number,code='INVALID_QUANTITY'):void{if(!Number.isSafeInteger(value)||value<=0)throw new DomainError(code,'مقدار باید عدد صحیح مثبت باشد.');}
export function assertMoney(value:number):void{if(!Number.isSafeInteger(value)||value<0)throw new DomainError('INVALID_MONEY','مبلغ باید عدد صحیح غیرمنفی به تومان باشد.');}
export function validateReceiptItem(item:ReceiptItemInput):void{
  assertPositiveInt(item.received_quantity); for(const q of [item.accepted_quantity,item.quarantine_quantity,item.rejected_quantity])if(!Number.isSafeInteger(q)||q<0)throw new DomainError('INVALID_RECEIPT_QUANTITY','مقادیر رسید نامعتبر است.');
  if(item.accepted_quantity+item.quarantine_quantity+item.rejected_quantity!==item.received_quantity)throw new DomainError('INVALID_RECEIPT_QUANTITY','جمع پذیرفته، قرنطینه و ردشده باید برابر مقدار دریافتی باشد.'); assertMoney(item.unit_cost_toman);
}
export function allocateByQuantity(total:number,items:Array<{id:string;quantity:number}>):Array<{goods_receipt_item_id:string;allocated_amount_toman:number}>{
  assertMoney(total); const qty=items.reduce((s,x)=>s+x.quantity,0); if(qty<=0)throw new DomainError('LANDED_COST_NO_ITEMS','قلم قابل تخصیص وجود ندارد.'); let left=total;
  return items.map((x,i)=>{const amount=i===items.length-1?left:Math.floor(total*x.quantity/qty);left-=amount;return{goods_receipt_item_id:x.id,allocated_amount_toman:amount};});
}
export function allocateByValue(total:number,items:Array<{id:string;quantity:number;unit_cost_toman:number}>):Array<{goods_receipt_item_id:string;allocated_amount_toman:number}>{
  assertMoney(total); const value=items.reduce((s,x)=>s+x.quantity*x.unit_cost_toman,0); if(value<=0)return allocateByQuantity(total,items.map(x=>({id:x.id,quantity:x.quantity})));let left=total;
  return items.map((x,i)=>{const base=x.quantity*x.unit_cost_toman;const amount=i===items.length-1?left:Math.floor(total*base/value);left-=amount;return{goods_receipt_item_id:x.id,allocated_amount_toman:amount};});
}
