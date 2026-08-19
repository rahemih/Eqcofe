-- Step 42 / A9: Customer HTTP administration permissions.
-- Additive and idempotent; role assignment remains an explicit administrative action.
INSERT INTO admin.permissions(key,module,name_fa,description_fa,risk_level) VALUES
 ('customer.wholesale.view','customer','مشاهده درخواست‌های عمده','مشاهده صف و جزئیات درخواست‌های همکاری عمده','normal'),
 ('customer.wholesale.review','customer','بررسی درخواست عمده','شروع فرایند بررسی درخواست همکاری عمده','high'),
 ('customer.wholesale.decide','customer','تصمیم نهایی درخواست عمده','تایید یا رد نهایی درخواست همکاری عمده و تغییر نوع مشتری','critical')
ON CONFLICT (key) DO NOTHING;
