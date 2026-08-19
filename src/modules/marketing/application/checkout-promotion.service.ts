import { Injectable } from '@nestjs/common';
import { AutomaticPromotionService,ResolvedAutomaticPromotion } from './automatic-promotion.service';
import { CouponEligibilityService } from './coupon-eligibility.service';

export interface CheckoutPromotionApplication {
  source:'automatic'|'coupon';
  promotionId:string;
  campaignId:string;
  couponId?:string;
  code?:string;
  name?:string;
  discountToman:number;
  stacking:'exclusive'|'stackable';
  firstPurchaseOnly?:boolean;
}

@Injectable()
export class CheckoutPromotionService {
  constructor(private readonly automatic:AutomaticPromotionService,private readonly coupons:CouponEligibilityService){}

  async evaluate(input:{couponCode?:string|null;customerId:string|null;subtotalToman:number;isWholesale:boolean;hasCompletedPurchase:boolean;now?:Date}){
    const auto=await this.automatic.resolve({customerId:input.customerId,subtotalToman:input.subtotalToman,isWholesale:input.isWholesale,hasCompletedPurchase:input.hasCompletedPurchase,now:input.now});
    const autoApps:CheckoutPromotionApplication[]=auto.items.map((x:ResolvedAutomaticPromotion)=>({source:'automatic',promotionId:x.promotionId,campaignId:x.campaignId,name:x.name,discountToman:x.discountToman,stacking:x.stacking,firstPurchaseOnly:x.firstPurchaseOnly}));
    const code=String(input.couponCode??'').trim();
    if(!code)return this.result(autoApps,input.subtotalToman);

    const coupon=await this.coupons.evaluate({code,customerId:input.customerId,subtotalToman:input.subtotalToman,isWholesale:input.isWholesale,hasCompletedPurchase:input.hasCompletedPurchase,now:input.now});
    const couponApp:CheckoutPromotionApplication={source:'coupon',promotionId:coupon.promotionId,campaignId:coupon.campaignId,couponId:coupon.couponId,code:coupon.code,discountToman:coupon.discountToman,stacking:coupon.stacking};

    if(coupon.stacking==='exclusive'){
      const autoTotal=this.sum(autoApps);
      if(coupon.discountToman>autoTotal)return this.result([couponApp],input.subtotalToman);
      if(coupon.discountToman<autoTotal)return this.result(autoApps,input.subtotalToman);
      const autoKey=autoApps.map(x=>x.promotionId).sort().join(':')||'~';
      return coupon.promotionId.localeCompare(autoKey)<=0?this.result([couponApp],input.subtotalToman):this.result(autoApps,input.subtotalToman);
    }

    if(autoApps.some(x=>x.stacking==='exclusive'))return this.result(autoApps,input.subtotalToman);
    const remaining=Math.max(0,input.subtotalToman-this.sum(autoApps));
    const applied=Math.min(remaining,coupon.discountToman);
    return this.result(applied>0?[...autoApps,{...couponApp,discountToman:applied}]:autoApps,input.subtotalToman);
  }

  private sum(items:CheckoutPromotionApplication[]){return items.reduce((s,x)=>s+x.discountToman,0);}
  private result(items:CheckoutPromotionApplication[],subtotalToman:number){const totalDiscountToman=Math.min(subtotalToman,this.sum(items));return{applications:items,totalDiscountToman};}
}
