-- EQCOFE Step 46 / A3 — Marketing and Customer Club RBAC.
-- Additive and idempotent. Role assignment remains an explicit administrative action.
INSERT INTO admin.permissions(key,module,name_fa,description_fa,risk_level) VALUES
 ('marketing.view','marketing','مشاهده بازاریابی','مشاهده کمپین‌ها، پروموشن‌ها، کوپن‌ها و وضعیت مصرف','normal'),
 ('marketing.manage','marketing','مدیریت بازاریابی','ایجاد و ویرایش کمپین، پروموشن و کوپن','high'),
 ('marketing.activate','marketing','فعال‌سازی بازاریابی','فعال‌سازی، توقف و آرشیو کمپین‌ها و پروموشن‌ها','critical'),
 ('marketing.redemption.view','marketing','مشاهده مصرف تخفیف','مشاهده سوابق رزرو، مصرف، آزادسازی و بازگشت تخفیف','normal'),
 ('marketing.redemption.manage','marketing','مدیریت مصرف تخفیف','عملیات مدیریتی حساس روی وضعیت Redemption','critical'),
 ('loyalty.view','loyalty','مشاهده باشگاه مشتریان','مشاهده مانده و تاریخچه امتیاز مشتریان','normal'),
 ('loyalty.adjust','loyalty','اصلاح امتیاز مشتری','ثبت اصلاح دستی امتیاز با ثبت ممیزی و الزام کنترل امنیتی','critical')
ON CONFLICT (key) DO NOTHING;
