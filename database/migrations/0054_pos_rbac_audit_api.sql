BEGIN;

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('pos.view','pos','مشاهده فروش حضوری و عملیات POS','normal'),
 ('pos.sell','pos','ثبت و نهایی‌سازی فروش حضوری','high'),
 ('pos.reconcile','pos','بازیابی و تطبیق عملیات آفلاین POS','high'),
 ('pos.admin','pos','مدیریت عملیاتی POS','critical')
ON CONFLICT (key) DO NOTHING;

COMMIT;
