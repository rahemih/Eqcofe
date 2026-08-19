export const PRICING_COST_BASIS = Symbol('PRICING_COST_BASIS');
export interface PricingCostBasisPort {
  getUnitCostToman(variantId: string): Promise<number | null>;
}
