BEGIN;

CREATE TABLE pos.offline_commands (
  id uuid PRIMARY KEY,
  client_command_id uuid NOT NULL UNIQUE,
  staff_actor_id uuid NOT NULL REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  command_type text NOT NULL CHECK (command_type IN ('sale.sync')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','applied','failed')),
  result jsonb NULL,
  error_code text NULL CHECK (error_code IS NULL OR char_length(error_code) BETWEEN 1 AND 120),
  queued_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz NULL,
  failed_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status='queued' AND applied_at IS NULL AND failed_at IS NULL AND result IS NULL AND error_code IS NULL)
    OR (status='applied' AND applied_at IS NOT NULL AND failed_at IS NULL AND result IS NOT NULL AND error_code IS NULL)
    OR (status='failed' AND applied_at IS NULL AND failed_at IS NOT NULL AND error_code IS NOT NULL)
  )
);

CREATE INDEX offline_commands_staff_status_idx ON pos.offline_commands(staff_actor_id,status,queued_at,id);

CREATE TABLE pos.offline_command_line_effects (
  command_id uuid NOT NULL REFERENCES pos.offline_commands(id) ON DELETE RESTRICT,
  line_index integer NOT NULL CHECK (line_index BETWEEN 0 AND 999),
  sale_id uuid NOT NULL REFERENCES pos.physical_sales(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (command_id,line_index),
  UNIQUE (command_id,variant_id)
);

COMMIT;
