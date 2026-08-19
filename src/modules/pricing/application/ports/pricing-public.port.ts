export const PRICING_PUBLIC_PORT=Symbol('PRICING_PUBLIC_PORT');
export interface PricingPublicPort {
  hasSellablePrice(productId:string):Promise<boolean>;
  getVariantPrice(variantId:string,quantity?:number,customerType?:'retail'|'wholesale'):Promise<any|null>;
  getProductPrice(productId:string,quantity?:number,customerType?:'retail'|'wholesale'):Promise<any|null>;
  getProductPrices(productIds:string[],quantity?:number,customerType?:'retail'|'wholesale'):Promise<Record<string,any|null>>;
}
