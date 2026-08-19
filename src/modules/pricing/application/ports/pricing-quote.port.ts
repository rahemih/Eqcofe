export const PRICING_QUOTE_PORT=Symbol('PRICING_QUOTE_PORT');
export interface PricingQuotePort { quoteVariant(input:{variantId:string;quantity:number;customerType?:'retail'|'wholesale'}):Promise<any|null>; }
