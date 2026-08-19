export const CATALOG_PRICING_ELIGIBILITY=Symbol('CATALOG_PRICING_ELIGIBILITY');
export interface CatalogPricingEligibilityPort { hasSellablePrice(productId:string):Promise<boolean>; }
export class DeferredPricingEligibility implements CatalogPricingEligibilityPort { async hasSellablePrice(_productId:string):Promise<boolean>{return false;} }
