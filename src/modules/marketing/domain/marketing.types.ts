export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended' | 'archived';
export type PromotionKind = 'percentage' | 'fixed_toman';
export type PromotionStacking = 'exclusive' | 'stackable';
export type RedemptionStatus = 'reserved' | 'consumed' | 'released' | 'reversed';

export interface PromotionEligibility {
  startsAt: Date;
  endsAt: Date;
  minimumSubtotalToman?: number;
  firstPurchaseOnly?: boolean;
  allowWholesale?: boolean;
  totalUsageLimit?: number;
  perCustomerUsageLimit?: number;
}

export interface PromotionDefinition {
  id: string;
  campaignId: string;
  name: string;
  kind: PromotionKind;
  value: number;
  stacking?: PromotionStacking;
  eligibility: PromotionEligibility;
}

export interface PromotionEvaluationContext {
  customerId: string | null;
  subtotalToman: number;
  isWholesale: boolean;
  hasCompletedPurchase: boolean;
  totalRedemptions: number;
  customerRedemptions: number;
  now: Date;
}

export interface PromotionEvaluationResult {
  eligible: boolean;
  reason: string | null;
  discountToman: number;
}
