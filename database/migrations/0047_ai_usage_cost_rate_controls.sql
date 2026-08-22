BEGIN;

CREATE TABLE ai.usage_policies (
  operation text PRIMARY KEY CHECK (operation IN ('product_qa','draft_content')),
  enabled boolean NOT NULL DEFAULT true,
  max_requests_per_minute integer NOT NULL CHECK (max_requests_per_minute > 0),
  max_input_tokens_per_request integer NOT NULL CHECK (max_input_tokens_per_request > 0),
  max_output_tokens_per_request integer NOT NULL CHECK (max_output_tokens_per_request > 0),
  daily_budget_micros bigint NOT NULL CHECK (daily_budget_micros >= 0),
  input_cost_micros_per_1k integer NOT NULL CHECK (input_cost_micros_per_1k >= 0),
  output_cost_micros_per_1k integer NOT NULL CHECK (output_cost_micros_per_1k >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE ai.usage_reservations (
  request_id uuid PRIMARY KEY,
  operation text NOT NULL REFERENCES ai.usage_policies(operation) ON DELETE RESTRICT,
  minute_bucket timestamptz NOT NULL,
  day_bucket date NOT NULL,
  estimated_input_tokens integer NOT NULL CHECK (estimated_input_tokens >= 0),
  reserved_output_tokens integer NOT NULL CHECK (reserved_output_tokens >= 0),
  reserved_cost_micros bigint NOT NULL CHECK (reserved_cost_micros >= 0),
  actual_input_tokens integer NULL CHECK (actual_input_tokens IS NULL OR actual_input_tokens >= 0),
  actual_output_tokens integer NULL CHECK (actual_output_tokens IS NULL OR actual_output_tokens >= 0),
  actual_cost_micros bigint NULL CHECK (actual_cost_micros IS NULL OR actual_cost_micros >= 0),
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','settled','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz NULL
);

CREATE INDEX idx_ai_usage_reservations_operation_minute ON ai.usage_reservations(operation, minute_bucket);
CREATE INDEX idx_ai_usage_reservations_operation_day ON ai.usage_reservations(operation, day_bucket);

INSERT INTO ai.usage_policies(operation,max_requests_per_minute,max_input_tokens_per_request,max_output_tokens_per_request,daily_budget_micros,input_cost_micros_per_1k,output_cost_micros_per_1k)
VALUES
  ('product_qa',60,8000,1000,10000000,1000,3000),
  ('draft_content',20,12000,4000,20000000,1000,3000)
ON CONFLICT (operation) DO NOTHING;

COMMIT;
