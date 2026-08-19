import type { DatabaseExecutor } from '../../../../platform/database/transaction-manager';
export const INVENTORY_AVAILABILITY_PORT=Symbol('INVENTORY_AVAILABILITY_PORT');
export const INVENTORY_RESERVATION_PORT=Symbol('INVENTORY_RESERVATION_PORT');
export const INVENTORY_COST_BASIS_PORT=Symbol('INVENTORY_COST_BASIS_PORT');
export interface InventoryAvailabilityPort { getOnlineSellableQuantity(variantId:string):Promise<number>; getUnitCostToman(variantId:string):Promise<number|null>; planOnlineReservation(items:{variant_id:string;quantity:number}[]):Promise<{warehouse_id:string;variant_id:string;quantity:number}[]>; }
export interface InventoryCostBasisPort { getProfitGuardUnitCostToman(variantId:string):Promise<number|null>; }
export interface InventoryReservationPort {
  reserve(input:{cart_id?:string;order_id?:string;customer_id?:string;expires_at:string;payment_grace_until?:string;items:{warehouse_id:string;variant_id:string;quantity:number}[]}):Promise<{id:string;status:string}>;
  attachOrderInTransaction(ex:DatabaseExecutor,reservationId:string,orderId:string,paymentGraceUntil:string):Promise<{reservation_id:string;order_id:string}>;
  reserveInTransaction(ex:DatabaseExecutor,input:{cart_id?:string;order_id?:string;customer_id?:string;expires_at:string;payment_grace_until?:string;items:{warehouse_id:string;variant_id:string;quantity:number}[]}):Promise<{id:string;status:string}>;
  beginPayment(id:string):Promise<{id:string;status:string}>;
  convert(id:string):Promise<{id:string;status:string}>;
  release(id:string,target?:'released'|'expired'|'cancelled'):Promise<{id:string;status:string}>;
  releaseInTransaction(ex:DatabaseExecutor,id:string,target?:'released'|'expired'|'cancelled'):Promise<{id:string;status:string}>;
  markLatePaymentReview(id:string):Promise<{id:string;status:string}>;
  releaseConvertedCommitment(id:string):Promise<{id:string;status:string;released_quantity:number}>;
}
