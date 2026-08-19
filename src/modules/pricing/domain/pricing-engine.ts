import { DomainError } from '../../../shared/errors/domain-error';
import { EffectivePriceRule, PriceBreakdown } from './pricing.types';

export class PricingEngine {
  calculate(basePriceToman:number,rules:EffectivePriceRule[],quantity:number,customerType:'retail'|'wholesale'='retail'):PriceBreakdown {
    assertMoney(basePriceToman); if(!Number.isInteger(quantity)||quantity<1)throw new DomainError('INVALID_QUANTITY','تعداد باید حداقل ۱ باشد.');
    const eligible=rules.filter(r=>(r.minQuantity==null||quantity>=r.minQuantity)&&(r.maxQuantity==null||quantity<=r.maxQuantity)&&(r.customerType==null||r.customerType===customerType)).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
    const exclusive=eligible.find(r=>r.stackingPolicy==='exclusive');
    const selected=exclusive?[exclusive]:[...eligible.filter(r=>r.stackingPolicy==='stackable'),...bestOnly(eligible.filter(r=>r.stackingPolicy==='best_only'),basePriceToman)];
    let current=basePriceToman; let discount=0;
    for(const rule of selected){const d=discountFor(rule,current);discount+=d;current=Math.max(0,current-d);}
    return {basePriceToman,discountToman:discount,finalPriceToman:current,appliedRuleIds:selected.map(x=>x.id),warnings:[]};
  }
}
function bestOnly(rules:EffectivePriceRule[],base:number):EffectivePriceRule[]{if(!rules.length)return[];return [rules.reduce((a,b)=>discountFor(b,base)>discountFor(a,base)?b:a)];}
function discountFor(rule:EffectivePriceRule,amount:number):number {if(rule.valueType==='percentage')return Math.min(amount,Math.round(amount*(rule.valueNumeric/100)));return Math.min(amount,Math.round(rule.valueNumeric));}
function assertMoney(v:number){if(!Number.isSafeInteger(v)||v<0)throw new DomainError('INVALID_MONEY','مبلغ تومان نامعتبر است.');}

export function applyPriceChange(oldPrice:number,changeType:string,value:number):number {
  if(!Number.isSafeInteger(oldPrice)||oldPrice<0||!Number.isFinite(value)||value<0)throw new DomainError('VALIDATION_ERROR','پارامتر تغییر قیمت نامعتبر است.');
  const result=changeType==='set_price'?value:changeType==='increase_percent'?oldPrice*(1+value/100):changeType==='decrease_percent'?oldPrice*(1-value/100):changeType==='increase_fixed'?oldPrice+value:changeType==='decrease_fixed'?oldPrice-value:NaN;
  if(!Number.isFinite(result))throw new DomainError('VALIDATION_ERROR','نوع تغییر قیمت معتبر نیست.'); return Math.max(0,Math.round(result));
}
export function roundMoney(value:number,multiple:number):number {if(!Number.isSafeInteger(multiple)||multiple<1)throw new DomainError('VALIDATION_ERROR','قاعده گرد کردن نامعتبر است.');return Math.round(value/multiple)*multiple;}
