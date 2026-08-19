export type PriceRuleValueType='percentage'|'fixed_toman';
export type StackingPolicy='exclusive'|'stackable'|'best_only';
export type CustomerType='retail'|'wholesale';
export interface EffectivePriceRule { id:string; nameFa:string; priority:number; valueType:PriceRuleValueType; valueNumeric:number; minQuantity:number|null; maxQuantity:number|null; customerType:CustomerType|null; stackingPolicy:StackingPolicy; }
export interface PriceBreakdown { basePriceToman:number; discountToman:number; finalPriceToman:number; appliedRuleIds:string[]; warnings:string[]; }
