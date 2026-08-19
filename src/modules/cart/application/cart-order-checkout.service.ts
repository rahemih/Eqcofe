import { Inject,Injectable } from '@nestjs/common';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';
import { hashCapabilityToken } from '../../../shared/security/capability-token';
import { CartRepository } from '../infrastructure/cart.repository';
import { STORE_CONFIGURATION_PORT,StoreConfigurationPort } from '../../configuration/application/ports/store-configuration.port';
import { CartOrderCheckoutPort,ReservedCheckoutForOrder } from './ports/cart-order-checkout.port';

@Injectable()
export class CartOrderCheckoutService implements CartOrderCheckoutPort {
  constructor(private readonly repo:CartRepository,@Inject(STORE_CONFIGURATION_PORT)private readonly config:StoreConfigurationPort){}
  async loadReservedForOrder(ex:DatabaseExecutor,checkoutId:string,token:string):Promise<ReservedCheckoutForOrder>{
    if(!token)throw new DomainError('CHECKOUT_ACCESS_REQUIRED','توکن Checkout الزامی است.');
    const c=await this.repo.checkout(checkoutId,ex,true);
    if(!c||c.status!=='reserved'||new Date(c.expires_at)<=new Date()||hashCapabilityToken(token)!==c.token_hash)throw new DomainError('CHECKOUT_INVALID','Checkout رزروشده معتبر نیست.');
    if(await this.repo.checkoutHasUnsellableItems(checkoutId,ex))throw new DomainError('PRODUCT_NOT_SELLABLE','یکی از اقلام سفارش دیگر قابل فروش نیست.');
    if(!await this.repo.shipping(String(c.shipping_method_id),ex))throw new DomainError('SHIPPING_METHOD_UNAVAILABLE','روش ارسال دیگر در دسترس نیست.');
    const items=await this.repo.checkoutItems(checkoutId,ex);if(!items.length)throw new DomainError('CHECKOUT_EMPTY','Checkout قلمی ندارد.');
    return{id:String(c.id),cart_id:String(c.cart_id),customer_id:c.customer_id?String(c.customer_id):null,reservation_id:String(c.reservation_id),subtotal_toman:Number(c.subtotal_toman),discount_toman:Number(c.discount_toman),shipping_toman:Number(c.shipping_toman),tax_toman:Number(c.tax_toman),total_toman:Number(c.total_toman),items:items.map((i:any)=>({id:String(i.id),product_id:String(i.product_id),variant_id:String(i.variant_id),sku:String(i.sku),product_name:String(i.product_name),quantity:Number(i.quantity),unit_base_toman:Number(i.unit_base_toman),unit_final_toman:Number(i.unit_final_toman),discount_toman:Number(i.discount_toman),tax_toman:Number(i.tax_toman),tax_rule_id:String(i.tax_rule_id),line_total_toman:Number(i.line_total_toman),pricing_snapshot:i.pricing_snapshot}))};
  }
  async finalizeOrderCreation(ex:DatabaseExecutor,checkoutId:string):Promise<void>{
    const c=await this.repo.checkout(checkoutId,ex,true);if(!c||c.status!=='reserved')throw new DomainError('CHECKOUT_INVALID','Checkout در وضعیت مناسب نیست.');
    const cfg:any=this.config;const raw=typeof cfg.getNumber==='function'?await cfg.getNumber('orders.guest_access_ttl_days',7):typeof cfg.get==='function'?Number(cfg.get('GUEST_ORDER_ACCESS_TTL_DAYS','7')):7;const days=Math.min(Math.max(Number(raw)||7,1),30);const guestAccessExpiresAt=new Date(Date.now()+days*86400000).toISOString();
    if(!await this.repo.markOrderCreated(ex,checkoutId,String(c.cart_id),guestAccessExpiresAt))throw new DomainError('CHECKOUT_FINALIZE_CONFLICT','Checkout یا سبد همزمان تغییر کرده است.');
  }
  async assertGuestAccess(ex:DatabaseExecutor,checkoutId:string,token:string):Promise<void>{
    if(!token)throw new DomainError('CHECKOUT_ACCESS_REQUIRED','توکن Checkout الزامی است.');
    const c=await this.repo.checkout(checkoutId,ex,false);if(!c||c.customer_id!==null||c.status!=='order_created'||!c.guest_order_access_expires_at||new Date(c.guest_order_access_expires_at)<=new Date()||hashCapabilityToken(token)!==c.token_hash)throw new DomainError('ORDER_NOT_FOUND','سفارش پیدا نشد.');
  }
}
