-- EQCOFE Step 44 / A8 canonical notification templates for launch-critical domain events
WITH seed(template_key,channel,locale,subject_template,body_template,required_variables,allowed_variables,strict_variables) AS (
  VALUES
  ('order.submitted','in_app','fa-IR','سفارش {{reference}} ثبت شد','سفارش {{reference}} ثبت شد و در انتظار تکمیل پرداخت/تایید است.','["reference"]','["reference"]',true),
  ('order.submitted','sms','fa-IR',NULL,'سفارش {{reference}} ثبت شد و در انتظار تکمیل پرداخت/تایید است.','["reference"]','["reference"]',true),
  ('order.submitted','email','fa-IR','سفارش {{reference}} ثبت شد','سفارش {{reference}} ثبت شد و در انتظار تکمیل پرداخت/تایید است.','["reference"]','["reference"]',true),
  ('order.confirmed','in_app','fa-IR','سفارش {{reference}} تایید شد','سفارش {{reference}} با موفقیت تایید شد.','["reference"]','["reference"]',true),
  ('order.confirmed','sms','fa-IR',NULL,'سفارش {{reference}} با موفقیت تایید شد.','["reference"]','["reference"]',true),
  ('order.confirmed','email','fa-IR','سفارش {{reference}} تایید شد','سفارش {{reference}} با موفقیت تایید شد.','["reference"]','["reference"]',true),
  ('order.cancelled','in_app','fa-IR','سفارش {{reference}} لغو شد','سفارش {{reference}} لغو شد.','["reference"]','["reference"]',true),
  ('order.cancelled','sms','fa-IR',NULL,'سفارش {{reference}} لغو شد.','["reference"]','["reference"]',true),
  ('order.cancelled','email','fa-IR','سفارش {{reference}} لغو شد','سفارش {{reference}} لغو شد.','["reference"]','["reference"]',true),
  ('order.expired','in_app','fa-IR','مهلت سفارش {{reference}} پایان یافت','مهلت تایید سفارش {{reference}} پایان یافته است.','["reference"]','["reference"]',true),
  ('order.expired','sms','fa-IR',NULL,'مهلت تایید سفارش {{reference}} پایان یافته است.','["reference"]','["reference"]',true),
  ('order.expired','email','fa-IR','مهلت سفارش {{reference}} پایان یافت','مهلت تایید سفارش {{reference}} پایان یافته است.','["reference"]','["reference"]',true),
  ('payment.paid','in_app','fa-IR','پرداخت سفارش {{reference}} موفق بود','پرداخت سفارش {{reference}} با موفقیت ثبت شد.','["reference"]','["reference"]',true),
  ('payment.paid','sms','fa-IR',NULL,'پرداخت سفارش {{reference}} با موفقیت ثبت شد.','["reference"]','["reference"]',true),
  ('payment.paid','email','fa-IR','پرداخت سفارش {{reference}} موفق بود','پرداخت سفارش {{reference}} با موفقیت ثبت شد.','["reference"]','["reference"]',true),
  ('payment.failed','in_app','fa-IR','پرداخت سفارش {{reference}} ناموفق بود','پرداخت سفارش {{reference}} ناموفق بود. می‌توانید دوباره تلاش کنید.','["reference"]','["reference"]',true),
  ('payment.failed','sms','fa-IR',NULL,'پرداخت سفارش {{reference}} ناموفق بود. می‌توانید دوباره تلاش کنید.','["reference"]','["reference"]',true),
  ('payment.failed','email','fa-IR','پرداخت سفارش {{reference}} ناموفق بود','پرداخت سفارش {{reference}} ناموفق بود. می‌توانید دوباره تلاش کنید.','["reference"]','["reference"]',true),
  ('payment.refund.updated','in_app','fa-IR','بازپرداخت سفارش {{reference}} به‌روزرسانی شد','وضعیت بازپرداخت مرتبط با سفارش {{reference}} به‌روزرسانی شد.','["reference"]','["reference"]',true),
  ('payment.refund.updated','sms','fa-IR',NULL,'وضعیت بازپرداخت مرتبط با سفارش {{reference}} به‌روزرسانی شد.','["reference"]','["reference"]',true),
  ('payment.refund.updated','email','fa-IR','بازپرداخت سفارش {{reference}} به‌روزرسانی شد','وضعیت بازپرداخت مرتبط با سفارش {{reference}} به‌روزرسانی شد.','["reference"]','["reference"]',true),
  ('shipment.ready','in_app','fa-IR','مرسوله سفارش {{reference}} آماده شد','مرسوله سفارش {{reference}} آماده ارسال است.','["reference"]','["reference"]',true),
  ('shipment.ready','sms','fa-IR',NULL,'مرسوله سفارش {{reference}} آماده ارسال است.','["reference"]','["reference"]',true),
  ('shipment.ready','email','fa-IR','مرسوله سفارش {{reference}} آماده شد','مرسوله سفارش {{reference}} آماده ارسال است.','["reference"]','["reference"]',true),
  ('shipment.handed_over','in_app','fa-IR','مرسوله سفارش {{reference}} تحویل حامل شد','مرسوله سفارش {{reference}} به شرکت/مامور ارسال تحویل شد.','["reference"]','["reference"]',true),
  ('shipment.handed_over','sms','fa-IR',NULL,'مرسوله سفارش {{reference}} به شرکت/مامور ارسال تحویل شد.','["reference"]','["reference"]',true),
  ('shipment.handed_over','email','fa-IR','مرسوله سفارش {{reference}} تحویل حامل شد','مرسوله سفارش {{reference}} به شرکت/مامور ارسال تحویل شد.','["reference"]','["reference"]',true),
  ('shipment.cancelled','in_app','fa-IR','ارسال سفارش {{reference}} لغو شد','ارسال مرتبط با سفارش {{reference}} لغو شد.','["reference"]','["reference"]',true),
  ('shipment.cancelled','sms','fa-IR',NULL,'ارسال مرتبط با سفارش {{reference}} لغو شد.','["reference"]','["reference"]',true),
  ('shipment.cancelled','email','fa-IR','ارسال سفارش {{reference}} لغو شد','ارسال مرتبط با سفارش {{reference}} لغو شد.','["reference"]','["reference"]',true),
  ('after_sales.update','in_app','fa-IR','{{title}}','{{message}}','["title", "message"]','["title", "message", "reference"]',true),
  ('after_sales.update','sms','fa-IR',NULL,'{{message}}','["title", "message"]','["title", "message", "reference"]',true),
  ('after_sales.update','email','fa-IR','{{title}}','{{message}}','["title", "message"]','["title", "message", "reference"]',true),
  ('inventory.availability.changed','in_app','fa-IR','تغییر موجودی کالا','موجودی/دسترس‌پذیری کالا در انبار {{warehouse_id}} برای واریانت {{variant_id}} تغییر کرد.','["warehouse_id", "variant_id"]','["warehouse_id", "variant_id"]',true)
)
INSERT INTO notifications.templates(id,template_key,channel,locale,version,status,subject_template,body_template,required_variables,allowed_variables,strict_variables,created_by,activated_by,activated_at)
SELECT gen_random_uuid(),s.template_key,s.channel,s.locale,
  COALESCE((SELECT max(t.version)+1 FROM notifications.templates t WHERE t.template_key=s.template_key AND t.channel=s.channel AND t.locale=s.locale),1),
  'active',s.subject_template,s.body_template,s.required_variables::jsonb,s.allowed_variables::jsonb,s.strict_variables,NULL,NULL,now()
FROM seed s
WHERE NOT EXISTS (SELECT 1 FROM notifications.templates t WHERE t.template_key=s.template_key AND t.channel=s.channel AND t.locale=s.locale AND t.status='active')
ON CONFLICT DO NOTHING;
