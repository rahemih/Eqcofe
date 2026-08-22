BEGIN;

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('pos.view','pos','مشاهده فروش حضوری و عملیات POS','normal'),
 ('pos.sell','pos','ثبت و نهایی‌سازی فروش حضوری','sensitive'),
 ('pos.reconcile','pos','بازیابی و تطبیق عملیات آفلاین POS','sensitive')
ON CONFLICT (key) DO NOTHING;

COMMIT;
