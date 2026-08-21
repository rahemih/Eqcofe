BEGIN;

CREATE TABLE ai.invocation_observations (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL UNIQUE,
  operation text NOT NULL CHECK (operation IN ('product_qa','draft_content')),
  prompt_key text NOT NULL CHECK (char_length(prompt_key) BETWEEN 1 AND 100),
  prompt_version integer NOT NULL CHECK (prompt_version > 0),
  outcome text NOT NULL CHECK (outcome IN ('succeeded','provider_failed','application_failed')),
  provider_failure_kind text NULL,
  model text NULL CHECK (model IS NULL OR char_length(model) <= 200),
  input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_invocation_observations_operation_created
  ON ai.invocation_observations(operation, created_at DESC);
CREATE INDEX idx_ai_invocation_observations_outcome_created
  ON ai.invocation_observations(outcome, created_at DESC);

CREATE OR REPLACE FUNCTION ai.reject_invocation_observation_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ai.invocation_observations is append-only';
END;
$$;

CREATE TRIGGER trg_ai_invocation_observations_append_only
BEFORE UPDATE OR DELETE ON ai.invocation_observations
FOR EACH ROW EXECUTE FUNCTION ai.reject_invocation_observation_mutation();

COMMIT;
