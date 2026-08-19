export const RETURN_CUSTOMER_READ_PORT=Symbol('RETURN_CUSTOMER_READ_PORT');
export interface ReturnCustomerReadPort{
  list():Promise<unknown>;
  get(returnNumber:string):Promise<unknown>;
  timeline(returnNumber:string):Promise<unknown>;
}
