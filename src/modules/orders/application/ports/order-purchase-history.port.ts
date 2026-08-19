export interface OrderPurchaseHistoryPort {
  hasCompletedPurchase(customerId:string):Promise<boolean>;
}

export const ORDER_PURCHASE_HISTORY_PORT=Symbol('ORDER_PURCHASE_HISTORY_PORT');
