import { Inject,Injectable } from '@nestjs/common';
import { createHash,randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { DomainError } from '../../../shared/errors/domain-error';
import { FulfillmentRepository } from '../infrastructure/fulfillment.repository';
import { FulfillmentService } from './fulfillment.service';
import { INVENTORY_FULFILLMENT_PORT,InventoryFulfillmentPort } from '../../inventory/application/ports/inventory-fulfillment.port';
import { ORDER_FULFILLMENT_PORT,OrderFulfillmentPort } from '../../orders/application/ports/order-fulfillment.port';
import { ShippingProviderRegistry } from './ports/shipping-provider.registry';
import { ShippingTrackingUpdate } from './ports/shipping-provider.port';
import { fulfillmentEvent } from '../domain/fulfillment.events';
function sha(b:Buffer){return createHash('sha256').update(b).digest('hex');}

@Injectable()
export class ShipmentService{
  constructor(
    private readonly tx:TransactionManager,private readonly repo:FulfillmentRepository,private readonly fulfillment:FulfillmentService,
    private readonly ctx:RequestContextStore,private readonly outbox:OutboxWriter,private readonly providers:ShippingProviderRegistry,
    @Inject(INVENTORY_FULFILLMENT_PORT) private readonly inventory:InventoryFulfillmentPort,
    @Inject(ORDER_FULFILLMENT_PORT) private readonly orders:OrderFulfillmentPort,
  ){}
  list(){return this.repo.listShipments();}
  async get(id:string){const x=await this.repo.shipmentView(id);if(!x)throw new DomainError('SHIPMENT_NOT_FOUND','مرسوله پیدا نشد.');return x;}
  private context(){return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system' as const}};}
  private assertEligible(o:any){if(o.status!=='confirmed')throw new DomainError('FULFILLMENT_ORDER_NOT_CONFIRMED','فقط سفارش تأییدشده قابل ارسال است.');if(!o.settlementPaymentId||!['paid','partially_refunded'].includes(o.paymentStatus))throw new DomainError('FULFILLMENT_PAYMENT_NOT_SETTLED','پرداخت نهایی سفارش تأیید نشده است.');}

  async create(input:{order_id:string;warehouse_id:string;carrier_provider_id?:string|null;shipping_method:string;items:{order_item_id:string;quantity:number}[]}){
    const method=String(input?.shipping_method??'').trim();if(!method||method.length>80)throw new DomainError('VALIDATION_ERROR','روش ارسال معتبر نیست.');
    if(!input?.items?.length)throw new DomainError('VALIDATION_ERROR','حداقل یک قلم مرسوله الزامی است.');
    const seen=new Set<string>();for(const x of input.items){if(seen.has(x.order_item_id))throw new DomainError('SHIPMENT_DUPLICATE_ORDER_ITEM','قلم سفارش در مرسوله تکراری است.');seen.add(x.order_item_id);if(!Number.isInteger(Number(x.quantity))||Number(x.quantity)<=0)throw new DomainError('INVALID_QUANTITY','تعداد مرسوله نامعتبر است.');}
    const ctx=this.context();
    return this.tx.run(async ex=>{
      const order=await this.orders.getForFulfillment(ex,input.order_id,true);if(!order)throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');this.assertEligible(order);
      const orderItems=new Map(order.items.map(x=>[x.id,x]));for(const x of input.items)if(!orderItems.has(x.order_item_id))throw new DomainError('FULFILLMENT_ORDER_ITEM_INVALID','قلم سفارش متعلق به این سفارش نیست.');
      const carrier=input.carrier_provider_id?await this.repo.carrier(ex,input.carrier_provider_id):null;if(input.carrier_provider_id&&!carrier)throw new DomainError('CARRIER_PROVIDER_NOT_FOUND','ارائه‌دهنده حمل فعال پیدا نشد.');
      const id=randomUUID();await this.repo.insertShipment(ex,{id,orderId:input.order_id,warehouseId:input.warehouse_id,carrierProviderId:input.carrier_provider_id??null,providerKey:carrier?String(carrier.provider_key):null,shippingMethod:method});
      for(const line of [...input.items].sort((a,b)=>a.order_item_id.localeCompare(b.order_item_id))){
        let need=Number(line.quantity);
        for(const c of await this.repo.shipmentCandidates(ex,input.order_id,input.warehouse_id,line.order_item_id)){
          if(need<=0)break;const available=Number(c.available_quantity);if(available<=0)continue;const q=Math.min(need,available);
          await this.repo.insertShipmentItem(ex,{id:randomUUID(),shipmentId:id,allocationId:String(c.allocation_id),orderItemId:line.order_item_id,quantity:q});need-=q;
        }
        if(need>0)throw new DomainError('SHIPMENT_EXCEEDS_PICKED','مقدار Pickشده برای ساخت مرسوله کافی نیست.',{order_item_id:line.order_item_id,remaining:need});
      }
      const f=await this.fulfillment.recalculateInTransaction(ex,input.order_id);
      await this.outbox.append(ex,[fulfillmentEvent('shipment.created.v1',id,1,{shipment_id:id,order_id:input.order_id,warehouse_id:input.warehouse_id,shipping_method:method,provider_key:carrier?String(carrier.provider_key):null,fulfillment_status:f.status})],ctx);
      return this.repo.shipment(ex,id,false);
    });
  }

  async markReady(id:string){const ctx=this.context();return this.tx.run(async ex=>{const sh=await this.repo.shipment(ex,id,true);if(!sh)throw new DomainError('SHIPMENT_NOT_FOUND','مرسوله پیدا نشد.');if(sh.status==='ready')return sh;if(sh.status!=='draft')throw new DomainError('INVALID_STATE_TRANSITION','مرسوله در وضعیت قابل آماده‌سازی نیست.');const next=await this.repo.setShipmentState(ex,id,'ready');await this.outbox.append(ex,[fulfillmentEvent('shipment.ready.v1',id,Number(sh.version)+1,{shipment_id:id,order_id:String(sh.order_id)})],ctx);return next;});}

  async handover(id:string){const ctx=this.context();return this.tx.run(async ex=>{
    const sh=await this.repo.shipment(ex,id,true);if(!sh)throw new DomainError('SHIPMENT_NOT_FOUND','مرسوله پیدا نشد.');if(sh.status==='handed_over')return sh;if(sh.status!=='ready')throw new DomainError('INVALID_STATE_TRANSITION','فقط مرسوله آماده قابل تحویل به حامل است.');
    const rows=await this.repo.shipmentItemsForHandover(ex,id);if(!rows.length)throw new DomainError('SHIPMENT_ITEMS_REQUIRED','مرسوله بدون قلم قابل تحویل نیست.');
    const grouped=new Map<string,number>();for(const r of rows)grouped.set(String(r.allocation_id),(grouped.get(String(r.allocation_id))??0)+Number(r.quantity));
    for(const [allocationId,q] of [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b))){
      const before=rows.find(x=>String(x.allocation_id)===allocationId)!;const nextShipped=Number(before.shipped_quantity)+q;
      if(nextShipped>Number(before.picked_quantity))throw new DomainError('SHIPMENT_EXCEEDS_PICKED','مقدار مرسوله از Pick بیشتر است.');
      const progress=await this.repo.addShippedQuantity(ex,allocationId,q);const complete=Number(progress.shipped_quantity)===Number(before.allocation_quantity);
      await this.inventory.consumeForShipment(ex,{allocationId,quantity:q,complete});
    }
    const next=await this.repo.setShipmentState(ex,id,'handed_over');const f=await this.fulfillment.recalculateInTransaction(ex,String(sh.order_id));
    await this.outbox.append(ex,[fulfillmentEvent('shipment.handed_over.v1',id,Number(sh.version)+1,{shipment_id:id,order_id:String(sh.order_id),fulfillment_status:f.status})],ctx);return next;
  });}

  async cancel(id:string,reason:string){const r=String(reason??'').trim();if(r.length<2||r.length>2000)throw new DomainError('VALIDATION_ERROR','دلیل لغو مرسوله معتبر نیست.');const ctx=this.context();return this.tx.run(async ex=>{const sh=await this.repo.shipment(ex,id,true);if(!sh)throw new DomainError('SHIPMENT_NOT_FOUND','مرسوله پیدا نشد.');if(sh.status==='cancelled')return sh;if(!['draft','ready'].includes(String(sh.status)))throw new DomainError('INVALID_STATE_TRANSITION','مرسوله پس از تحویل به حامل قابل لغو نیست.');const next=await this.repo.setShipmentState(ex,id,'cancelled',r);await this.outbox.append(ex,[fulfillmentEvent('shipment.cancelled.v1',id,Number(sh.version)+1,{shipment_id:id,order_id:String(sh.order_id),reason:r})],ctx);return next;});}

  async refreshTracking(id:string){
    const sh=await this.repo.shipment(this.repo.db(),id,false);if(!sh)throw new DomainError('SHIPMENT_NOT_FOUND','مرسوله پیدا نشد.');
    if(!sh.provider_key||!sh.tracking_number)throw new DomainError('SHIPMENT_TRACKING_NOT_AVAILABLE','کد رهگیری و ارائه‌دهنده حمل برای این مرسوله ثبت نشده است.');
    const updates=await this.providers.resolve(String(sh.provider_key)).refresh({trackingNumber:String(sh.tracking_number)});
    for(const u of updates)await this.applyTracking(String(sh.provider_key),u);
    return this.get(id);
  }

  async webhook(providerKey:string,headers:Record<string,string|string[]|undefined>,body:unknown,rawBody?:Buffer){
    if(!rawBody?.length)throw new DomainError('SHIPPING_WEBHOOK_RAW_BODY_REQUIRED','Raw body برای Webhook حمل الزامی است.');
    const normalized=String(providerKey).trim().toLowerCase();const provider=this.providers.resolve(normalized);
    const update=await provider.parseWebhook({headers,body,rawBody});const payloadHash=sha(rawBody);const eventId=String(update.externalEventId??payloadHash);
    return this.tx.run(async ex=>{
      const inbox=await this.repo.registerWebhook(ex,{id:randomUUID(),providerKey:normalized,externalEventId:eventId,trackingNumber:update.trackingNumber,payloadHash});
      if(String(inbox.payload_hash)!==payloadHash)throw new DomainError('SHIPPING_WEBHOOK_EVENT_CONFLICT','Webhook حمل با Payload متفاوت تکرار شده است.');
      if(inbox.status==='processed')return{accepted:true,duplicate:true};
      const sh=await this.repo.shipmentByTracking(ex,normalized,update.trackingNumber,true);
      if(!sh){await this.repo.markWebhook(ex,normalized,eventId,'failed',null,'SHIPMENT_NOT_FOUND');throw new DomainError('SHIPMENT_NOT_FOUND','مرسوله متناظر Webhook پیدا نشد.');}
      await this.applyTrackingInTransaction(ex,normalized,update,String(sh.id),payloadHash);
      await this.repo.markWebhook(ex,normalized,eventId,'processed',String(sh.id),null);
      return{accepted:true,duplicate:false};
    });
  }

  private async applyTracking(providerKey:string,u:ShippingTrackingUpdate){const payloadHash=sha(Buffer.from(JSON.stringify(u.payload)));return this.tx.run(ex=>this.applyTrackingInTransaction(ex,providerKey,u,undefined,payloadHash));}
  private async applyTrackingInTransaction(ex:any,providerKey:string,u:ShippingTrackingUpdate,shipmentId?:string,payloadHash?:string){
    const sh=shipmentId?await this.repo.shipment(ex,shipmentId,true):await this.repo.shipmentByTracking(ex,providerKey,u.trackingNumber,true);
    if(!sh)throw new DomainError('SHIPMENT_NOT_FOUND','مرسوله متناظر رهگیری پیدا نشد.');
    const hash=payloadHash??sha(Buffer.from(JSON.stringify(u.payload)));if(u.occurredAt.getTime()>Date.now()+5*60_000)throw new DomainError('SHIPPING_TRACKING_TIME_INVALID','زمان رویداد رهگیری در آینده نامعتبر است.');
    await this.repo.insertTrackingEvent(ex,{id:randomUUID(),shipmentId:String(sh.id),providerKey,externalEventId:u.externalEventId??null,trackingNumber:u.trackingNumber,providerStatus:u.providerStatus,normalizedStatus:u.normalizedStatus,occurredAt:u.occurredAt,payloadHash:hash,payload:u.payload});
    const allowed:Record<string,string[]>={handed_over:['in_transit','delivered','delivery_failed'],in_transit:['delivered','delivery_failed','returned'],delivery_failed:['in_transit','returned']};
    if((allowed[String(sh.status)]??[]).includes(u.normalizedStatus))await this.repo.setShipmentState(ex,String(sh.id),u.normalizedStatus);
    return sh;
  }
}
