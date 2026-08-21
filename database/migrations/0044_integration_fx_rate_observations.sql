CREATE TABLE IF NOT EXISTS integrations.fx_rate_observations (
  id bigserial PRIMARY KEY,
  provider_key varchar(100) NOT NULL,
  source_currency_code char(3) NOT NULL CHECK (source_currency_code ~ '^[A-Z]{3}$'),
  target_unit varchar(10) NOT NULL CHECK (target_unit = 'TOMAN'),
  rate_to_toman bigint NOT NULL CHECK (rate_to_toman > 0),
  observed_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL,
  source_reference varchar(300) NULL,
  provider_request_id varchar(200) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (observed_at <= fetched_at + interval '2 minutes')
);

CREATE INDEX IF NOT EXISTS ix_integration_fx_rate_latest
  ON integrations.fx_rate_observations(provider_key, source_currency_code, observed_at DESC, id DESC);

CREATE OR REPLACE FUNCTION integrations.guard_fx_rate_observation_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'INTEGRATION_FX_RATE_OBSERVATION_IMMUTABLE';
END $$;

DROP TRIGGER IF EXISTS trg_fx_rate_observation_no_update ON integrations.fx_rate_observations;
CREATE TRIGGER trg_fx_rate_observation_no_update
BEFORE UPDATE OR DELETE ON integrations.fx_rate_observations
FOR EACH ROW EXECUTE FUNCTION integrations.guard_fx_rate_observation_immutable();
