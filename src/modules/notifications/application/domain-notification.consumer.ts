import { Inject,Injectable,OnModuleInit } from '@nestjs/common';
import { Transaction } from 'kysely';
import { EventConsumerRegistry } from '../../../platform/events/event-consumer.registry';
import { EventConsumer,IntegrationEvent } from '../../../platform/events/integration-event';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { NotificationCommandService } from './notification-command.service';
import { ORDER_NOTIFICATION_CONTEXT_PORT,OrderNotificationContextPort } from '../../orders/application/ports/order-notification-context.port';
import { STAFF_NOTIFICATION_PORT,StaffNotificationPort } from '../../admin/application/staff-notification.port';

const AFTER_SALES=[
 'return.requested.v1','return.approved.v1','return.rejected.v1','return.received.v1','return.resolved.v1','return.cancelled.v1',
 'warranty.claim_requested.v1','warranty.approved.v1','warranty.rejected.v1','warranty.received.v1','warranty.resolved.v1','warranty.closed.v1',
 'after_sales.replacement.requested.v1'
] as const;
const CUSTOMER_EVENTS=[
 'order.submitted.v1','order.confirmed.v1','order.cancelled.v1','order.expired.v1',
 'payment.paid.v1','payment.failed.v1','payment.refunded.v1','payment.partially_refunded.v1',
 'shipment.ready.v1','shipment.handed_over.v1','shipment.cancelled.v1',...AFTER_SALES
] as const;
const TYPES=[...CUSTOMER_EVENTS,'inventory.availability.changed.v1'] as const;

@Injectable()
export class DomainNotificationConsumer implements EventConsumer,OnModuleInit{
 readonly consumerName='notifications.domain-events.v1';
 readonly eventTypes=TYPES;
 constructor(private readonly registry:EventConsumerRegistry,private readonly notifications:NotificationCommandService,@Inject(ORDER_NOTIFICATION_CONTEXT_PORT)private readonly orders:OrderNotificationContextPort,@Inject(STAFF_NOTIFICATION_PORT)private readonly staff:StaffNotificationPort){}
 onModuleInit(){this.registry.register(this);}
 async handle(event:IntegrationEvent,trx:Transaction<DatabaseSchema>):Promise<void>{
  if(event.event_type==='inventory.availability.changed.v1')return this.inventory(event,trx);
  const p=(event.payload??{}) as Record<string,unknown>;
  const orderId=typeof p.order_id==='string'?p.order_id:null;
  let customerId=typeof p.customer_id==='string'?p.customer_id:null,orderNumber=typeof p.order_number==='string'?p.order_number:null;
  if(orderId&&(!customerId||!orderNumber)){const o=await this.orders.byOrderId(trx,orderId);customerId=customerId??o?.customerId??null;orderNumber=orderNumber??o?.orderNumber??null;}
  if(!customerId)return;
  const m=this.mapCustomer(event.event_type,p,orderNumber);
  if(!m)return;
  await this.notifications.enqueueFromIntegrationEvent(trx,{notification_kind:m.kind,source_type:'domain_event',source_id:event.event_id,recipient_subject_type:'customer',recipient_subject_id:customerId,channels:['in_app','sms','email'],variables:m.variables,idempotency_key:`event:${event.event_id}:customer:${customerId}:${m.kind}`,priority:m.priority}, {eventId:event.event_id,traceId:event.trace_id,correlationId:event.correlation_id,causationId:event.causation_id});
 }
 private async inventory(event:IntegrationEvent,trx:Transaction<DatabaseSchema>){const p=(event.payload??{}) as Record<string,unknown>;const staffIds=await this.staff.activeWithPermission(trx,'inventory.view');for(const staffId of staffIds)await this.notifications.enqueueFromIntegrationEvent(trx,{notification_kind:'inventory.availability.changed',source_type:'domain_event',source_id:event.event_id,recipient_subject_type:'staff',recipient_subject_id:staffId,channels:['in_app'],variables:{warehouse_id:String(p.warehouse_id??''),variant_id:p.variant_id==null?'—':String(p.variant_id)},idempotency_key:`event:${event.event_id}:staff:${staffId}:inventory.availability.changed`,priority:35},{eventId:event.event_id,traceId:event.trace_id,correlationId:event.correlation_id,causationId:event.causation_id});}
 private mapCustomer(type:string,p:Record<string,unknown>,orderNumber:string|null):{kind:string;variables:Record<string,unknown>;priority:number}|null{
  const ref=orderNumber??String(p.return_number??p.claim_number??p.order_number??'سفارش شما');
  const simple:Record<string,{kind:string;priority:number}>={
   'order.submitted.v1':{kind:'order.submitted',priority:45},'order.confirmed.v1':{kind:'order.confirmed',priority:30},'order.cancelled.v1':{kind:'order.cancelled',priority:20},'order.expired.v1':{kind:'order.expired',priority:30},
   'payment.paid.v1':{kind:'payment.paid',priority:20},'payment.failed.v1':{kind:'payment.failed',priority:15},'payment.refunded.v1':{kind:'payment.refund.updated',priority:25},'payment.partially_refunded.v1':{kind:'payment.refund.updated',priority:25},
   'shipment.ready.v1':{kind:'shipment.ready',priority:35},'shipment.handed_over.v1':{kind:'shipment.handed_over',priority:25},'shipment.cancelled.v1':{kind:'shipment.cancelled',priority:20},
  };
  if(simple[type])return{...simple[type],variables:{reference:ref}};
  if((AFTER_SALES as readonly string[]).includes(type)){const [title,message]=this.afterSalesCopy(type);return{kind:'after_sales.update',priority:35,variables:{title,message,reference:ref}};}
  return null;
 }
 private afterSalesCopy(type:string):[string,string]{const map:Record<string,[string,string]>={
  'return.requested.v1':['درخواست مرجوعی ثبت شد','درخواست مرجوعی شما با موفقیت ثبت شد.'],'return.approved.v1':['مرجوعی تایید شد','درخواست مرجوعی شما تایید شد.'],'return.rejected.v1':['مرجوعی رد شد','درخواست مرجوعی شما پس از بررسی رد شد.'],'return.received.v1':['کالای مرجوعی دریافت شد','کالای مرجوعی شما دریافت و برای بررسی ثبت شد.'],'return.resolved.v1':['مرجوعی تعیین تکلیف شد','فرآیند مرجوعی شما تعیین تکلیف شد.'],'return.cancelled.v1':['مرجوعی لغو شد','درخواست مرجوعی شما لغو شد.'],
  'warranty.claim_requested.v1':['درخواست گارانتی ثبت شد','درخواست گارانتی شما با موفقیت ثبت شد.'],'warranty.approved.v1':['گارانتی تایید شد','درخواست گارانتی شما تایید شد.'],'warranty.rejected.v1':['گارانتی رد شد','درخواست گارانتی شما پس از بررسی رد شد.'],'warranty.received.v1':['کالای گارانتی دریافت شد','کالای شما برای فرآیند گارانتی دریافت شد.'],'warranty.resolved.v1':['گارانتی تعیین تکلیف شد','درخواست گارانتی شما تعیین تکلیف شد.'],'warranty.closed.v1':['پرونده گارانتی بسته شد','فرآیند گارانتی شما تکمیل و بسته شد.'],'after_sales.replacement.requested.v1':['جایگزینی ثبت شد','درخواست کالای جایگزین برای شما ثبت شد.']};return map[type]??['به‌روزرسانی خدمات پس از فروش','وضعیت خدمات پس از فروش شما به‌روزرسانی شد.'];}
}
