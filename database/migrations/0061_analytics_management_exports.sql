BEGIN;

CREATE TABLE analytics.management_exports (
  id uuid PRIMARY KEY,
  dataset_key text NOT NULL CHECK(dataset_key IN ('sales_revenue_daily','profit_daily','inventory_snapshot','customer_lifetime','wholesale_applications','fulfillment_operations','shipment_operations','return_operations','warranty_operations')),
  format text NOT NULL CHECK(format IN ('csv','json')),
  parameters jsonb NOT NULL CHECK(jsonb_typeof(parameters)='object'),
  status text NOT NULL CHECK(status IN ('queued','running','completed','failed')),
  requested_by uuid NOT NULL REFERENCES admin.staff_profiles(id) ON DELETE RESTRICT,
  idempotency_hash char(64) NOT NULL CHECK(idempotency_hash ~ '^[0-9a-f]{64}$'),
  row_count integer NULL CHECK(row_count IS NULL OR row_count BETWEEN 0 AND 500),
  source_watermark timestamptz NULL,
  filename text NULL,
  mime_type text NULL,
  content_hash char(64) NULL CHECK(content_hash IS NULL OR content_hash ~ '^[0-9a-f]{64}$'),
  content_text text NULL CHECK(content_text IS NULL OR octet_length(content_text)<=5242880),
  error_code text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requested_by,idempotency_hash),
  CHECK(status<>'completed' OR (row_count IS NOT NULL AND filename IS NOT NULL AND mime_type IS NOT NULL AND content_hash IS NOT NULL AND content_text IS NOT NULL AND completed_at IS NOT NULL)),
  CHECK(status<>'failed' OR (error_code IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX analytics_management_exports_actor_created_idx ON analytics.management_exports(requested_by,created_at DESC,id DESC);

CREATE OR REPLACE FUNCTION analytics.reject_terminal_export_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('completed','failed') THEN RAISE EXCEPTION 'ANALYTICS_TERMINAL_EXPORT_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER analytics_management_exports_terminal_immutable BEFORE UPDATE OR DELETE ON analytics.management_exports FOR EACH ROW EXECUTE FUNCTION analytics.reject_terminal_export_mutation();

INSERT INTO admin.permissions(key,module,name_fa,description_fa,risk_level) VALUES
 ('analytics.export.create','analytics','ایجاد خروجی مدیریتی','ساخت خروجی محدود و ثبت‌شده از Read Model تحلیلی','high'),
 ('analytics.export.view','analytics','مشاهده خروجی مدیریتی','مشاهده وضعیت و metadata خروجی‌های تحلیلی','normal'),
 ('analytics.export.download','analytics','دانلود خروجی مدیریتی','دریافت محتوای خروجی تحلیلی با ثبت رویداد دسترسی','high')
ON CONFLICT(key) DO NOTHING;

COMMIT;
