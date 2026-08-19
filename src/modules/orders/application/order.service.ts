import { Inject,Injectable } from '@nestjs/common';
import { Kysely,sql } from 'kysely';
import { randomUUID } from 'node:crypto';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';
import { INVENTORY_RESERVATION_PORT,InventoryReservationPort } from '../../inventory/application/ports/inventory-public.port';
import { CART_ORDER_CHECKOUT_PORT,CartOrderCheckoutPort } from '../../cart/application/ports/cart-order-checkout.port';
import { STORE_CONFIGURATION_PORT,StoreConfigurationPort } from '../../configuration/application/ports/store-configuration.port';
import { OutboxWriter } from '../../../platform/outbox/outbox-writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { ExecutionContext } from '../../../shared/application/execution-context';

function orderEvent(eventType:string,id:string,version:number,payload:Record<string,unknown>){return{eventType,eventVersion:1,aggregateType:'order',aggregateId:id,aggregateVersion:version,occurredAt:new Date(),payload};}

@Injectable()
export class OrderService{
 constructor(
  @Inject(KYSELY_DB)private readonly db:Kysely<DatabaseSchema>,
  private readonly tx:TransactionManager,
  @Inject(INVENTORY_RESERVATION_PORT)private readonly inventory:InventoryReservationPort,
  @Inject(CART_ORDER_CHECKOUT_PORT)private readonly checkout:CartOrderCheckoutPort,
  private readonly outbox:OutboxWriter,
  private readonly ctx:RequestContextStore,
  @Inject(STORE_CONFIGURATION_PORT)private readonly config:StoreConfigurationPort,
 ){}

 async create(checkoutId:string,token:string,address:any){
  if(!token)throw new DomainError('CHECKOUT_ACCESS_REQUIRED','توکن Checkout الزامی است.');
  const safeAddress=this.validateAddress(address);
  return this.tx.run(async ex=>{
   const c=await this.checkout.loadReservedForOrder(ex,checkoutId,token);
   const exists=await sql<any>`SELECT id FROM orders.orders WHERE checkout_id=${checkoutId}::uuid`.execute(ex);if(exists.rows[0])throw new DomainError('ORDER_ALREADY_CREATED','برای این Checkout قبلاً سفارش ساخته شده است.');
   const items=c.items;
   const id=randomUUID(),num=`EQ-${Date.now()}-${randomUUID().slice(0,8).toUpperCase()}`;
   const cfg:any=this.config;const raw=typeof cfg.getNumber==='function'?await cfg.getNumber('orders.pending_ttl_minutes',30):typeof cfg.get==='function'?Number(cfg.get('ORDER_PENDING_TTL_MINUTES','30')):30;const pendingMinutes=Math.max(Number(raw)||30,1);const confirmationExpiresAt=new Date(Date.now()+pendingMinutes*60_000);await sql`INSERT INTO orders.orders(id,order_number,checkout_id,customer_id,reservation_id,status,subtotal_toman,discount_toman,shipping_toman,tax_toman,total_toman,address_snapshot,confirmation_expires_at,version)
    VALUES(${id}::uuid,${num},${checkoutId}::uuid,${c.customer_id}::uuid,${c.reservation_id}::uuid,'pending_confirmation',${c.subtotal_toman},${c.discount_toman},${c.shipping_toman},${c.tax_toman},${c.total_toman},${JSON.stringify(safeAddress)}::jsonb,${confirmationExpiresAt}::timestamptz,2)`.execute(ex);
   for(const i of items)await sql`INSERT INTO orders.order_items(id,order_id,product_id,variant_id,sku,product_name,quantity,unit_base_toman,unit_final_toman,discount_toman,tax_toman,tax_rule_id,line_total_toman,pricing_snapshot)
    VALUES(${randomUUID()}::uuid,${id}::uuid,${i.product_id}::uuid,${i.variant_id}::uuid,${i.sku},${i.product_name},${i.quantity},${i.unit_base_toman},${i.unit_final_toman},${i.discount_toman},${i.tax_toman},${i.tax_rule_id}::uuid,${i.line_total_toman},${JSON.stringify(i.pricing_snapshot)}::jsonb)`.execute(ex);
   const paymentGraceUntil=confirmationExpiresAt.toISOString();await this.inventory.attachOrderInTransaction(ex,String(c.reservation_id),id,paymentGraceUntil);
   await this.checkout.finalizeOrderCreation(ex,checkoutId);
   await sql`INSERT INTO orders.order_status_history(id,order_id,to_status) VALUES(${randomUUID()}::uuid,${id}::uuid,'pending_confirmation')`.execute(ex);
   const context=this.contextOrSystem();
   await this.outbox.append(ex,[
    orderEvent('order.created.v1',id,1,{order_id:id,order_number:num,checkout_id:checkoutId,reservation_id:String(c.reservation_id),grand_total_toman:Number(c.total_toman)}),
    orderEvent('order.submitted.v1',id,2,{order_id:id,order_number:num,reservation_id:String(c.reservation_id),grand_total_toman:Number(c.total_toman)}),
   ],context);
   return this.getByNumber(num,ex);
  });
 }

 async getGuest(num:string,checkoutToken:string){
  if(!checkoutToken)throw new DomainError('CHECKOUT_ACCESS_REQUIRED','توکن Checkout الزامی است.');
  const r=await sql<any>`SELECT id,checkout_id FROM orders.orders WHERE order_number=${num} AND customer_id IS NULL LIMIT 1`.execute(this.db);
  if(!r.rows[0])throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');
  await this.checkout.assertGuestAccess(this.db,String(r.rows[0].checkout_id),checkoutToken);
  return this.getById(String(r.rows[0].id));
 }

 async getCustomer(num:string){const customerId=this.requireCustomerId();return this.getOwned(num,customerId);}
 async listCustomer(cursor:string|undefined,limit=25){const customerId=this.requireCustomerId();const safe=Math.min(Math.max(Number(limit)||25,1),100);let before:{created_at:string;id:string}|null=null;if(cursor){try{const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));if(!parsed?.created_at||!parsed?.id||Number.isNaN(new Date(parsed.created_at).getTime())||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(parsed.id)))throw new Error();before={created_at:new Date(parsed.created_at).toISOString(),id:String(parsed.id)};}catch{throw new DomainError('INVALID_CURSOR','Cursor معتبر نیست.');}}const r=before?await sql<any>`SELECT id,order_number,status,total_toman,created_at,updated_at FROM orders.orders WHERE customer_id=${customerId}::uuid AND (created_at,id)<(${before.created_at}::timestamptz,${before.id}::uuid) ORDER BY created_at DESC,id DESC LIMIT ${safe+1}`.execute(this.db):await sql<any>`SELECT id,order_number,status,total_toman,created_at,updated_at FROM orders.orders WHERE customer_id=${customerId}::uuid ORDER BY created_at DESC,id DESC LIMIT ${safe+1}`.execute(this.db);const rows=r.rows.slice(0,safe),hasMore=r.rows.length>safe,last=rows[rows.length-1];return{items:rows.map(({id,...x}:any)=>x),__pagination:{has_more:hasMore,next_cursor:hasMore&&last?Buffer.from(JSON.stringify({created_at:new Date(last.created_at).toISOString(),id:String(last.id)})).toString('base64url'):null}};}
 async timelineCustomer(num:string){
  const customerId=this.requireCustomerId();const o=await this.orderOwnedRow(num,customerId);
  const orderRows=await sql<any>`SELECT 'order' source,to_status status,reason,created_at FROM orders.order_status_history WHERE order_id=${o.id}::uuid`.execute(this.db);
  const fulfillmentRows=await sql<any>`SELECT 'fulfillment' source,status,NULL::text reason,updated_at created_at FROM fulfillment.fulfillments WHERE order_id=${o.id}::uuid`.execute(this.db);
  const shipmentRows=await sql<any>`SELECT 'shipment' source,status,NULL::text reason,updated_at created_at FROM fulfillment.shipments WHERE order_id=${o.id}::uuid`.execute(this.db);
  const timeline=[...orderRows.rows,...fulfillmentRows.rows,...shipmentRows.rows].sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
  return{order_number:num,timeline};
 }
 async invoiceCustomer(num:string){const order=await this.getCustomer(num);return{invoice_number:order.order_number,issued_at:order.created_at,order};}

 async getByNumber(num:string,ex:DatabaseExecutor=this.db){const r=await sql<any>`SELECT * FROM orders.orders WHERE order_number=${num}`.execute(ex);if(!r.rows[0])throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');return this.getById(String(r.rows[0].id),ex);}
 private async getById(id:string,ex:DatabaseExecutor=this.db){
  const r=await sql<any>`SELECT o.*,COALESCE(f.status,'unfulfilled') fulfillment_status FROM orders.orders o LEFT JOIN fulfillment.fulfillments f ON f.order_id=o.id WHERE o.id=${id}::uuid`.execute(ex);
  if(!r.rows[0])throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');
  const items=await sql<any>`SELECT * FROM orders.order_items WHERE order_id=${id}::uuid ORDER BY id`.execute(ex);
  return this.presentOrder(r.rows[0],items.rows);
 }
 private presentOrder(o:any,items:any[]){const status=String(o.status);return{id:String(o.id),order_number:String(o.order_number),customer_id:o.customer_id?String(o.customer_id):null,order_status:status,payment_status:String(o.payment_status??'unpaid'),fulfillment_status:String(o.fulfillment_status??'unfulfilled'),return_status:'none',items:items.map(i=>({id:String(i.id),product_id:String(i.product_id),variant_id:String(i.variant_id),product_name:String(i.product_name),sku:String(i.sku),quantity:Number(i.quantity),unit_base_toman:Number(i.unit_base_toman),unit_final_toman:Number(i.unit_final_toman),discount_toman:Number(i.discount_toman),tax_toman:Number(i.tax_toman),line_total_toman:Number(i.line_total_toman),pricing_snapshot:i.pricing_snapshot})),subtotal_toman:Number(o.subtotal_toman),discount_total_toman:Number(o.discount_toman),tax_total_toman:Number(o.tax_toman),shipping_charge_toman:Number(o.shipping_toman),grand_total_toman:Number(o.total_toman),allowed_actions:status==='pending_confirmation'?['cancel_order']:[],confirmation_expires_at:o.confirmation_expires_at,created_at:o.created_at,updated_at:o.updated_at};}
 private async getOwned(num:string,customerId:string){const r=await sql<any>`SELECT id FROM orders.orders WHERE order_number=${num} AND customer_id=${customerId}::uuid`.execute(this.db);if(!r.rows[0])throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');return this.getById(String(r.rows[0].id));}
 private async orderOwnedRow(num:string,customerId:string){const r=await sql<any>`SELECT * FROM orders.orders WHERE order_number=${num} AND customer_id=${customerId}::uuid`.execute(this.db);if(!r.rows[0])throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');return r.rows[0];}

 async cancelGuest(num:string,checkoutToken:string,input:{reason_code:string;note?:string|null}){if(!checkoutToken)throw new DomainError('CHECKOUT_ACCESS_REQUIRED','توکن Checkout الزامی است.');return this.cancelInternal(num,input,{guestToken:checkoutToken});}
 async cancelCustomer(num:string,input:{reason_code:string;note?:string|null}){return this.cancelInternal(num,input,{customerId:this.requireCustomerId()});}
 private async cancelInternal(num:string,input:{reason_code:string;note?:string|null},access:{guestToken?:string;customerId?:string}){
  const reasonCode=String(input?.reason_code??'').trim();const note=input?.note==null?null:String(input.note).trim();if(!reasonCode||reasonCode.length>100||(note&&note.length>1000))throw new DomainError('VALIDATION_ERROR','دلیل لغو معتبر نیست.');const reason=note?`${reasonCode}: ${note}`:reasonCode;
  return this.tx.run(async ex=>{
   const r=access.customerId
    ?await sql<any>`SELECT * FROM orders.orders WHERE order_number=${num} AND customer_id=${access.customerId}::uuid FOR UPDATE`.execute(ex)
    :await sql<any>`SELECT * FROM orders.orders WHERE order_number=${num} AND customer_id IS NULL FOR UPDATE`.execute(ex);
   const o=r.rows[0];if(!o)throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');if(!access.customerId)await this.checkout.assertGuestAccess(ex,String(o.checkout_id),access.guestToken!);if(o.status!=='pending_confirmation')throw new DomainError('INVALID_STATE_TRANSITION','سفارش در این وضعیت قابل لغو نیست.');
   await this.inventory.releaseInTransaction(ex,String(o.reservation_id),'cancelled');
   await sql`UPDATE orders.orders SET status='cancelled',version=version+1,updated_at=now() WHERE id=${o.id}::uuid`.execute(ex);
   await sql`INSERT INTO orders.order_status_history(id,order_id,from_status,to_status,reason) VALUES(${randomUUID()}::uuid,${o.id}::uuid,${o.status},'cancelled',${reason})`.execute(ex);
   await this.outbox.append(ex,[orderEvent('order.cancelled.v1',String(o.id),Number(o.version)+1,{order_id:String(o.id),order_number:num,reservation_id:String(o.reservation_id),reason_code:reasonCode,note})],this.contextOrSystem());
   return{order_number:num,status:'cancelled',reservation_id:o.reservation_id};
  });
 }

 async expireDue(limit=100){
  const ids=(await sql<any>`SELECT id FROM orders.orders WHERE status='pending_confirmation' AND confirmation_expires_at<=now() ORDER BY confirmation_expires_at,id LIMIT ${Math.min(Math.max(limit,1),500)}`.execute(this.db)).rows.map((x:any)=>String(x.id));
  const out=[] as any[];for(const id of ids){try{out.push(await this.expireOne(id));}catch(e){out.push({id,status:'failed',error:e instanceof Error?e.message:'unknown'});}}return out;
 }
 private async expireOne(id:string){return this.tx.run(async ex=>{const r=await sql<any>`SELECT * FROM orders.orders WHERE id=${id}::uuid FOR UPDATE`.execute(ex);const o=r.rows[0];if(!o||o.status!=='pending_confirmation')return{id,status:o?.status??'missing'};await this.inventory.releaseInTransaction(ex,String(o.reservation_id),'expired');await sql`UPDATE orders.orders SET status='expired',version=version+1,updated_at=now() WHERE id=${id}::uuid`.execute(ex);await sql`INSERT INTO orders.order_status_history(id,order_id,from_status,to_status,reason) VALUES(${randomUUID()}::uuid,${id}::uuid,'pending_confirmation','expired','confirmation_timeout')`.execute(ex);await this.outbox.append(ex,[orderEvent('order.expired.v1',id,Number(o.version)+1,{order_id:id,order_number:o.order_number,reservation_id:String(o.reservation_id)})],this.contextOrSystem());return{id,status:'expired'};});}



 private validateAddress(address:any){
  if(!address||typeof address!=='object'||Array.isArray(address))throw new DomainError('ADDRESS_INVALID','آدرس سفارش معتبر نیست.');
  const recipient_name=String(address.recipient_name??'').trim(),recipient_mobile=String(address.recipient_mobile??'').trim(),province_id=String(address.province_id??'').trim(),city_id=String(address.city_id??'').trim(),postal_code=String(address.postal_code??'').trim(),address_line=String(address.address_line??'').trim();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, mobile=/^09\d{9}$/;
  if(!recipient_name||recipient_name.length>150||!mobile.test(recipient_mobile)||!uuid.test(province_id)||!uuid.test(city_id)||!/^\d{10}$/.test(postal_code)||!address_line||address_line.length>1000)throw new DomainError('ADDRESS_INVALID','آدرس سفارش معتبر نیست.');
  const building_no=address.building_no==null?null:String(address.building_no).trim(),unit_no=address.unit_no==null?null:String(address.unit_no).trim();
  if((building_no&&building_no.length>30)||(unit_no&&unit_no.length>30))throw new DomainError('ADDRESS_INVALID','پلاک یا واحد معتبر نیست.');
  return{recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no:building_no||null,unit_no:unit_no||null};
 }

 private requireCustomerId(){const a=this.ctx.get()?.actor;if(a?.type!=='customer'||!a.id)throw new DomainError('CUSTOMER_REQUIRED','ورود مشتری الزامی است.');return a.id;}
 private contextOrSystem():ExecutionContext{return this.ctx.get()??{requestId:randomUUID(),correlationId:randomUUID(),actor:{type:'system'}};}
}
