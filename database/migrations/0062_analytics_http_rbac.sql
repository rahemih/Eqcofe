BEGIN;

INSERT INTO admin.permissions(key,module,name_fa,description_fa,risk_level) VALUES
 ('analytics.view','analytics','مشاهده تحلیل‌های مدیریتی','مشاهده Read Modelهای محدود و غیرمرجع Analytics','normal')
ON CONFLICT(key) DO NOTHING;

COMMIT;
