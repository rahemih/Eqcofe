export type CustomerCommerceType='retail'|'wholesale';

export const CUSTOMER_COMMERCE_PORT=Symbol('CUSTOMER_COMMERCE_PORT');

export interface CustomerCommercePort{
  getCustomerType(customerId:string|null):Promise<CustomerCommerceType>;
}
