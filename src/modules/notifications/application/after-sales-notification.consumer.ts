import { Injectable,OnModuleInit } from '@nestjs/common';
import { sql,Transaction } from 'kysely';
import { EventConsumerRegistry } from '../../../platform/events/event-consumer.registry';
import { EventConsumer,IntegrationEvent } from '../../../platform/events/integration-event';
import { DatabaseSchema } from '../../../platform/database/database.types';

const TYPES=[
  'return.requested.v1','return.approved.v1','return.rejected.v1','return.received.v1','return.resolved.v1','return.cancelled.v1',
  'warranty.claim_requested.v1','warranty.approved.v1','warranty.rejected.v1','warranty.received.v1','warranty.resolved.v1','warranty.closed.v1',
  'after_sales.replacement.requested.v1'
] as const;

@Injectable()
export class AfterSalesNotificationConsumer implements EventConsumer,OnModuleInit{
  readonly consumerName='notifications.after_sales.v1';
  readonly eventTypes=TYPES;
  constructor(private readonly registry:EventConsumerRegistry){}
  onModuleInit(){this.registry.register(this);}

  async handle(event:IntegrationEvent,trx:Transaction<DatabaseSchema>):Promise<void>{
    const customerId=await this.customerFor(event,trx);if(!customerId)return;
    const [title,message]=this.copy(event.event_type);
    await sql`INSERT INTO notifications.after_sales_notifications(id,event_id,customer_id,event_type,aggregate_type,aggregate_id,title_fa,message_fa,payload)
      VALUES(gen_random_uuid(),${event.event_id}::uuid,${customerId}::uuid,${event.event_type},${event.aggregate_type},${event.aggregate_id}::uuid,${title},${message},${JSON.stringify(event.payload)}::jsonb)
      ON CONFLICT(event_id) DO NOTHING`.execute(trx);
  }

  private async customerFor(event:IntegrationEvent,trx:Transaction<DatabaseSchema>):Promise<string|null>{
    const p=(event.payload??{}) as Record<string,unknown>;
    if(typeof p.customer_id==='string')return p.customer_id;
    if(event.aggregate_type==='return'){
      const r=await sql<any>`SELECT customer_id FROM returns.returns WHERE id=${event.aggregate_id}::uuid`.execute(trx);
      return r.rows[0]?.customer_id?String(r.rows[0].customer_id):null;
    }
    if(event.aggregate_type==='warranty_claim'){
      const r=await sql<any>`SELECT customer_id FROM warranty.claims WHERE id=${event.aggregate_id}::uuid`.execute(trx);
      return r.rows[0]?.customer_id?String(r.rows[0].customer_id):null;
    }
    return null;
  }

  private copy(type:string):[string,string]{
    const map:Record<string,[string,string]>={
      'return.requested.v1':['درخواست مرجوعی ثبت شد','درخواست مرجوعی شما با موفقیت ثبت شد.'],
      'return.approved.v1':['مرجوعی تایید شد','درخواست مرجوعی شما تایید شد.'],
      'return.rejected.v1':['مرجوعی رد شد','درخواست مرجوعی شما پس از بررسی رد شد.'],
      'return.received.v1':['کالای مرجوعی دریافت شد','کالای مرجوعی شما دریافت و برای بررسی ثبت شد.'],
      'return.resolved.v1':['مرجوعی تعیین تکلیف شد','فرآیند مرجوعی شما تعیین تکلیف شد.'],
      'return.cancelled.v1':['مرجوعی لغو شد','درخواست مرجوعی شما لغو شد.'],
      'warranty.claim_requested.v1':['درخواست گارانتی ثبت شد','درخواست گارانتی شما با موفقیت ثبت شد.'],
      'warranty.approved.v1':['گارانتی تایید شد','درخواست گارانتی شما تایید شد.'],
      'warranty.rejected.v1':['گارانتی رد شد','درخواست گارانتی شما پس از بررسی رد شد.'],
      'warranty.received.v1':['کالای گارانتی دریافت شد','کالای شما برای فرآیند گارانتی دریافت شد.'],
      'warranty.resolved.v1':['گارانتی تعیین تکلیف شد','درخواست گارانتی شما تعیین تکلیف شد.'],
      'warranty.closed.v1':['پرونده گارانتی بسته شد','فرآیند گارانتی شما تکمیل و بسته شد.'],
      'after_sales.replacement.requested.v1':['جایگزینی ثبت شد','درخواست کالای جایگزین برای شما ثبت شد.'],
    };
    return map[type]??['به‌روزرسانی خدمات پس از فروش','وضعیت خدمات پس از فروش شما به‌روزرسانی شد.'];
  }
}
