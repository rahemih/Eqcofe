export const ORDER_CUSTOMER_READ_PORT=Symbol('ORDER_CUSTOMER_READ_PORT');
export interface OrderCustomerReadPort{
  list(cursor?:string,limit?:number):Promise<unknown>;
  get(orderNumber:string):Promise<unknown>;
  timeline(orderNumber:string):Promise<unknown>;
  invoice(orderNumber:string):Promise<unknown>;
}
