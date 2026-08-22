BEGIN;

ALTER TABLE pos.offline_commands DROP CONSTRAINT IF EXISTS offline_commands_status_check;
ALTER TABLE pos.offline_commands
  ADD COLUMN recovery_count integer NOT NULL DEFAULT 0 CHECK (recovery_count BETWEEN 0 AND 5),
  ADD COLUMN abandoned_at timestamptz NULL,
  ADD CONSTRAINT offline_commands_status_check CHECK (status IN ('queued','applied','failed','abandoned'));

ALTER TABLE pos.offline_commands DROP CONSTRAINT IF EXISTS offline_commands_check;
ALTER TABLE pos.offline_commands
  ADD CONSTRAINT offline_commands_state_shape_check CHECK (
    (status='queued' AND applied_at IS NULL AND failed_at IS NULL AND abandoned_at IS NULL AND result IS NULL AND error_code IS NULL)
    OR (status='applied' AND applied_at IS NOT NULL AND failed_at IS NULL AND abandoned_at IS NULL AND result IS NOT NULL AND error_code IS NULL)
    OR (status='failed' AND applied_at IS NULL AND failed_at IS NOT NULL AND abandoned_at IS NULL AND result IS NULL AND error_code IS NOT NULL)
    OR (status='abandoned' AND applied_at IS NULL AND abandoned_at IS NOT NULL AND result IS NULL AND error_code IS NOT NULL)
  );

CREATE TABLE pos.offline_command_reconciliation_history (
  id uuid PRIMARY KEY,
  command_id uuid NOT NULL REFERENCES pos.offline_commands(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('retry_requested','abandoned')),
  actor_id uuid NOT NULL REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  prior_error_code text NOT NULL CHECK (char_length(prior_error_code) BETWEEN 1 AND 120),
  recovery_count integer NOT NULL CHECK (recovery_count BETWEEN 0 AND 5),
  note text NULL CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX offline_command_reconciliation_command_idx
  ON pos.offline_command_reconciliation_history(command_id,created_at,id);

CREATE OR REPLACE FUNCTION pos.guard_offline_reconciliation_history_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'offline command reconciliation history is immutable';
END;
$$;

CREATE TRIGGER trg_pos_offline_reconciliation_history_immutable
BEFORE UPDATE OR DELETE ON pos.offline_command_reconciliation_history
FOR EACH ROW EXECUTE FUNCTION pos.guard_offline_reconciliation_history_immutable();

COMMIT;
