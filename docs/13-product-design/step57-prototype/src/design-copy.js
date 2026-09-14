const words=[[/authoritative/gi,'معتبر سامانه'],[/Session/g,'نشست'],[/step-up/gi,'تأیید دوبارهٔ هویت'],[/quote/gi,'جمع محاسبه‌شده'],[/mutation/gi,'ثبت تغییر'],[/summary/gi,'خلاصه'],[/conflict/gi,'تغییر هم‌زمان'],[/Tabs/g,'بخش‌ها'],[/field/gi,'فیلد']];
export const designCopy=value=>words.reduce((s,[pattern,label])=>s.replace(pattern,label),String(value??''));
