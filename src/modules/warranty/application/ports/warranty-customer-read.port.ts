export const WARRANTY_CUSTOMER_READ_PORT=Symbol('WARRANTY_CUSTOMER_READ_PORT');
export interface WarrantyCustomerReadPort{
  list():Promise<unknown>;
  get(claimNumber:string):Promise<unknown>;
  timeline(claimNumber:string):Promise<unknown>;
}
