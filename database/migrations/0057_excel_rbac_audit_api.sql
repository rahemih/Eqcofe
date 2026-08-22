BEGIN;

INSERT INTO admin.permissions(key,module,name_fa,description_fa,risk_level) VALUES
 ('excel.view','excel','مشاهده و پیش‌نمایش عملیات اکسل','دریافت قرارداد خروجی، dry-run و previewهای امن Excel','normal'),
 ('excel.import','excel','ثبت واردسازی اکسل','ایجاد import job از workbook اعتبارسنجی‌شده','sensitive'),
 ('excel.apply','excel','اعمال تغییرات اکسل','اعمال تغییرات Catalog/Pricing فقط از preview معتبر و boundary مالک','critical'),
 ('excel.recover','excel','بازیابی واردسازی اکسل','بازیابی صریح و محدود import job ناموفق','critical')
ON CONFLICT (key) DO NOTHING;

COMMIT;
