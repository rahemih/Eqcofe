CREATE TABLE IF NOT EXISTS integrations.provider_health_samples (
  id bigserial PRIMARY KEY,
  provider_key varchar(100) NOT NULL,
  provider_kind varchar(30) NOT NULL CHECK (provider_kind IN ('fx','sms','email','shipping','payment_aux')),
  state varchar(20) NOT NULL CHECK (state IN ('healthy','degraded','unavailable','unknown')),
  checked_at timestamptz NOT NULL,
  latency_ms integer NULL CHECK (latency_ms IS NULL OR latency_ms >= 0),
  failure_kind varchar(30) NULL,
  failure_code varchar(120) NULL,
  provider_status integer NULL CHECK (provider_status IS NULL OR provider_status BETWEEN 100 AND 599),
  provider_request_id varchar(200) NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_integration_health_provider_checked
  ON integrations.provider_health_samples(provider_key, checked_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS ix_integration_health_kind_checked
  ON integrations.provider_health_samples(provider_kind, checked_at DESC);

CREATE OR REPLACE FUNCTION integrations.guard_provider_health_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'INTEGRATION_PROVIDER_HEALTH_IMMUTABLE';
END $$;

DROP TRIGGER IF EXISTS trg_provider_health_no_update ON integrations.provider_health_samples;
CREATE TRIGGER trg_provider_health_no_update
BEFORE UPDATE OR DELETE ON integrations.provider_health_samples
FOR EACH ROW EXECUTE FUNCTION integrations.guard_provider_health_immutable();
