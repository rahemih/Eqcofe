export const CATALOG_CUSTOMER_PORT=Symbol('CATALOG_CUSTOMER_PORT');
export interface CatalogCustomerPort{ productExists(productId:string):Promise<boolean>; }
