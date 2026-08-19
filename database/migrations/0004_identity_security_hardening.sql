CREATE TABLE IF NOT EXISTS audit.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type varchar(30) NOT NULL,
  actor_id uuid,
  action varchar(160) NOT NULL,
  resource_type varchar(100) NOT NULL,
  resource_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  ip_address inet,
  request_id varchar(120),
  trace_id varchar(120),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_resource ON audit.audit_logs(resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON audit.audit_logs(actor_type, actor_id, occurred_at DESC);

ALTER TABLE admin.staff_profiles ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE admin.roles ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1 CHECK (version > 0);

CREATE INDEX IF NOT EXISTS ix_auth_attempts_ip_time
  ON iam.auth_attempts(attempt_type, source_ip, occurred_at DESC)
  WHERE source_ip IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_otp_challenge_purpose') THEN
    ALTER TABLE iam.otp_challenges
      ADD CONSTRAINT ck_otp_challenge_purpose CHECK (purpose IN ('customer_login')) NOT VALID;
    ALTER TABLE iam.otp_challenges VALIDATE CONSTRAINT ck_otp_challenge_purpose;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_sessions_actor_active
  ON iam.sessions(actor_type, expires_at)
  WHERE revoked_at IS NULL;
