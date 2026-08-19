CREATE TABLE IF NOT EXISTS events.outbox (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL UNIQUE,
  event_type varchar(200) NOT NULL,
  event_version integer NOT NULL CHECK (event_version > 0),
  aggregate_type varchar(100) NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version bigint NOT NULL CHECK (aggregate_version > 0),
  correlation_id uuid,
  causation_id uuid,
  trace_id varchar(200),
  payload jsonb NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('pending','processing','published','failed','dead_letter')),
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  locked_at timestamptz,
  locked_by varchar(200),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code varchar(120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_outbox_pending ON events.outbox (available_at, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_outbox_processing ON events.outbox (locked_at)
  WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS ix_outbox_aggregate ON events.outbox (aggregate_type, aggregate_id, aggregate_version);

CREATE TABLE IF NOT EXISTS events.consumer_inbox (
  consumer_name varchar(200) NOT NULL,
  event_id uuid NOT NULL,
  event_type varchar(200) NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('processing','processed','failed','dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error_code varchar(120),
  PRIMARY KEY (consumer_name, event_id)
);

CREATE TABLE IF NOT EXISTS events.idempotency_keys (
  id uuid PRIMARY KEY,
  scope varchar(200) NOT NULL,
  idempotency_key varchar(200) NOT NULL,
  request_hash char(64) NOT NULL,
  response_code integer,
  response_body jsonb,
  status varchar(30) NOT NULL CHECK (status IN ('running','completed','failed')),
  locked_until timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (scope, idempotency_key)
);
CREATE INDEX IF NOT EXISTS ix_idempotency_expiry ON events.idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS events.process_instances (
  id uuid PRIMARY KEY,
  process_type varchar(150) NOT NULL,
  business_key varchar(200) NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('running','waiting','completed','failed','cancelled','manual_review')),
  current_step varchar(150),
  correlation_id uuid NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failed_at timestamptz,
  last_error_code varchar(120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process_type, business_key)
);

CREATE TABLE IF NOT EXISTS events.process_steps (
  id uuid PRIMARY KEY,
  process_instance_id uuid NOT NULL REFERENCES events.process_instances(id) ON DELETE RESTRICT,
  step_name varchar(150) NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('pending','running','completed','failed','skipped')),
  command_name varchar(200),
  event_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  error_code varchar(120),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ix_process_steps_instance ON events.process_steps (process_instance_id, started_at);

CREATE TABLE IF NOT EXISTS operations.manual_review_items (
  id uuid PRIMARY KEY,
  process_instance_id uuid REFERENCES events.process_instances(id) ON DELETE RESTRICT,
  reason_code varchar(120) NOT NULL,
  severity varchar(30) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status varchar(30) NOT NULL CHECK (status IN ('open','assigned','resolved','dismissed')),
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_manual_review_open ON operations.manual_review_items (created_at)
  WHERE status IN ('open','assigned');
