CREATE TABLE IF NOT EXISTS integrations.provider_configurations (
  provider_key varchar(64) PRIMARY KEY,
  provider_kind varchar(20) NOT NULL CHECK (provider_kind IN ('fx','sms','email','shipping','payment_aux')),
  enabled boolean NOT NULL DEFAULT false,
  base_url text NULL,
  timeout_ms integer NOT NULL DEFAULT 5000 CHECK (timeout_ms BETWEEN 100 AND 120000),
  retry_max_attempts integer NOT NULL DEFAULT 0 CHECK (retry_max_attempts BETWEEN 0 AND 5),
  secret_ref varchar(128) NULL CHECK (secret_ref IS NULL OR secret_ref ~ '^EQCOFE_[A-Z0-9_]{3,120}$'),
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config)='object'),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  CHECK (base_url IS NULL OR base_url ~ '^https://|^http://localhost(?::[0-9]+)?(?:/|$)|^http://127\.0\.0\.1(?::[0-9]+)?(?:/|$)')
);

CREATE INDEX IF NOT EXISTS ix_integration_provider_kind_enabled
  ON integrations.provider_configurations(provider_kind,enabled);

CREATE OR REPLACE FUNCTION integrations.reject_sensitive_provider_config()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE payload text;
BEGIN
  payload := lower(NEW.config::text);
  IF payload ~ '"[^"]*(secret|token|password|credential|authorization|api[_-]?key|private[_-]?key)[^"]*"\s*:' THEN
    RAISE EXCEPTION 'INTEGRATION_SECRET_IN_CONFIG_FORBIDDEN';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_integrations_provider_config_guard ON integrations.provider_configurations;
CREATE TRIGGER trg_integrations_provider_config_guard
BEFORE INSERT OR UPDATE ON integrations.provider_configurations
FOR EACH ROW EXECUTE FUNCTION integrations.reject_sensitive_provider_config();

INSERT INTO admin.permissions(key,module,name_fa,description_fa,risk_level)
VALUES
 ('integrations.view','integrations','مشاهده اتصال‌ها','مشاهده پیکربندی غیرمحرمانه و وضعیت اتصال Providerها','normal'),
 ('integrations.manage','integrations','مدیریت اتصال‌ها','مدیریت پیکربندی غیرمحرمانه Providerها و فعال/غیرفعال‌سازی','high'),
 ('integrations.secret_ref.manage','integrations','مدیریت ارجاع Secret','تغییر نام ارجاع Secret محیطی بدون مشاهده مقدار Secret','critical')
ON CONFLICT (key) DO NOTHING;
