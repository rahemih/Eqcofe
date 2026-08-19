INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
('configuration.view','configuration','مشاهده تنظیمات','normal'),
('configuration.edit','configuration','ویرایش تنظیمات کم‌ریسک','high'),
('configuration.review','configuration','بررسی درخواست تغییر تنظیمات','high'),
('configuration.apply','configuration','اعمال و بازگردانی تنظیمات','critical'),
('configuration.feature_flags.manage','configuration','مدیریت Feature Flag','critical')
ON CONFLICT(key) DO NOTHING;