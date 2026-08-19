import { DomainError } from '../../../shared/errors/domain-error';
import { FulfillmentLineState,FulfillmentStatus } from './fulfillment.types';

function whole(n:number,name:string){if(!Number.isInteger(n)||n<0)throw new DomainError('FULFILLMENT_INVALID_QUANTITY',`${name} نامعتبر است.`);return n;}

export function assertLineState(line:FulfillmentLineState):void{
  const ordered=whole(line.ordered,'تعداد سفارش'),allocated=whole(line.allocated,'تعداد تخصیص'),picked=whole(line.picked,'تعداد Pick'),shipped=whole(line.shipped,'تعداد ارسال'),delivered=whole(line.delivered,'تعداد تحویل');
  if(allocated>ordered)throw new DomainError('FULFILLMENT_ALLOCATION_EXCEEDS_ORDER','تخصیص بیشتر از تعداد سفارش است.');
  if(picked>allocated)throw new DomainError('FULFILLMENT_PICK_EXCEEDS_ALLOCATION','Pick بیشتر از تخصیص است.');
  if(shipped>picked)throw new DomainError('FULFILLMENT_SHIP_EXCEEDS_PICK','ارسال بیشتر از مقدار Pick شده است.');
  if(delivered>shipped)throw new DomainError('FULFILLMENT_DELIVERY_EXCEEDS_SHIPMENT','تحویل بیشتر از مقدار ارسال‌شده است.');
}

export function calculateFulfillmentStatus(lines:readonly FulfillmentLineState[],preparationStarted:boolean,cancelled=false):FulfillmentStatus{
  if(cancelled)return 'cancelled';
  if(lines.length===0)return 'unfulfilled';
  for(const line of lines)assertLineState(line);
  const total=lines.reduce((a,x)=>a+x.ordered,0);
  const allocated=lines.reduce((a,x)=>a+x.allocated,0);
  const shipped=lines.reduce((a,x)=>a+x.shipped,0);
  const delivered=lines.reduce((a,x)=>a+x.delivered,0);
  if(delivered===total&&total>0)return 'delivered';
  if(delivered>0)return 'partially_delivered';
  if(shipped===total&&total>0)return 'shipped';
  if(shipped>0)return 'partially_shipped';
  if(preparationStarted&&allocated===total&&total>0)return 'preparing';
  if(allocated===total&&total>0)return 'allocated';
  if(allocated>0)return 'partially_allocated';
  return 'unfulfilled';
}

export function validatePickChange(current:number,delta:number,allocationQuantity:number):number{
  whole(current,'مقدار Pick فعلی'); whole(delta,'مقدار Pick'); whole(allocationQuantity,'مقدار تخصیص');
  if(delta<=0)throw new DomainError('FULFILLMENT_PICK_QUANTITY_INVALID','مقدار Pick باید مثبت باشد.');
  const next=current+delta;if(next>allocationQuantity)throw new DomainError('FULFILLMENT_PICK_EXCEEDS_ALLOCATION','مقدار Pick از تخصیص بیشتر است.');return next;
}
export function validateUnpickChange(current:number,delta:number,shipped:number):number{
  whole(current,'مقدار Pick فعلی'); whole(delta,'مقدار Unpick'); whole(shipped,'مقدار ارسال');
  if(delta<=0)throw new DomainError('FULFILLMENT_UNPICK_QUANTITY_INVALID','مقدار Unpick باید مثبت باشد.');
  const next=current-delta;if(next<0)throw new DomainError('FULFILLMENT_UNPICK_EXCEEDS_PICK','مقدار Unpick از Pick بیشتر است.');
  if(next<shipped)throw new DomainError('FULFILLMENT_UNPICK_BELOW_SHIPPED','کالای ارسال‌شده قابل Unpick نیست.');return next;
}
