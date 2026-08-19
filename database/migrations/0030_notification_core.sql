BEGIN;

CREATE TABLE IF NOT EXISTS notifications.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key varchar(160) NOT NULL,
  channel varchar(20) NOT NULL CHECK (channel IN ('sms','email','in_app')),
  locale varchar(20) NOT NULL DEFAULT 'fa-IR',
  version integer NOT NULL CHECK (version > 0),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  subject_template text NULL,
  body_template text NOT NULL CHECK (length(body_template) BETWEEN 1 AND 20000),
  required_variables jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(required_variables)='array'),
  allowed_variables jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowed_variables)='array'),
  strict_variables boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  activated_by uuid NULL,
  activated_at timestamptz NULL,
  retired_by uuid NULL,
  retired_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_template_subject_shape CHECK (
    (channel='email' AND subject_template IS NOT NULL AND length(subject_template) BETWEEN 1 AND 500)
    OR (channel<>'email' AND (subject_template IS NULL OR length(subject_template) <= 500))
  ),
  CONSTRAINT notification_template_activation_shape CHECK (
    (status='draft' AND activated_at IS NULL AND retired_at IS NULL)
    OR (status='active' AND activated_at IS NOT NULL AND retired_at IS NULL)
    OR (status='retired' AND retired_at IS NOT NULL)
  ),
  UNIQUE(template_key, channel, locale, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_template_active
  ON notifications.templates(template_key, channel, locale)
  WHERE status='active';
CREATE INDEX IF NOT EXISTS ix_notification_templates_lookup
  ON notifications.templates(template_key, channel, locale, version DESC);

CREATE TABLE IF NOT EXISTS notifications.notification_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_kind varchar(160) NOT NULL,
  source_type varchar(100) NOT NULL,
  source_id varchar(200) NOT NULL,
  source_event_id uuid NULL,
  recipient_subject_type varchar(30) NOT NULL CHECK (recipient_subject_type IN ('customer','staff','internal')),
  recipient_subject_id varchar(200) NOT NULL,
  routing_revision integer NOT NULL DEFAULT 1 CHECK (routing_revision > 0),
  status varchar(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','partially_delivered','delivered','failed','dead_lettered','cancelled')),
  priority smallint NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  locale varchar(20) NOT NULL DEFAULT 'fa-IR',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
  idempotency_key varchar(200) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  CONSTRAINT notification_intent_terminal_shape CHECK (
    (status='cancelled' AND cancelled_at IS NOT NULL)
    OR (status<>'cancelled' AND cancelled_at IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_intent_source
  ON notifications.notification_intents(
    source_type, source_id, notification_kind, recipient_subject_type, recipient_subject_id, routing_revision
  );
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_intent_event_kind_recipient
  ON notifications.notification_intents(source_event_id, notification_kind, recipient_subject_type, recipient_subject_id, routing_revision)
  WHERE source_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_intent_idempotency
  ON notifications.notification_intents(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_notification_intents_recipient_created
  ON notifications.notification_intents(recipient_subject_type,recipient_subject_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_notification_intents_status_created
  ON notifications.notification_intents(status,priority DESC,created_at,id);

CREATE TABLE IF NOT EXISTS notifications.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications.notification_intents(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL CHECK (channel IN ('sms','email','in_app')),
  status varchar(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','retry_wait','blocked','failed','dead_lettered','cancelled')),
  template_id uuid NULL REFERENCES notifications.templates(id) ON DELETE RESTRICT,
  template_key varchar(160) NULL,
  template_version integer NULL CHECK (template_version IS NULL OR template_version > 0),
  destination_masked varchar(320) NULL,
  destination_ciphertext text NULL,
  rendered_subject text NULL CHECK (rendered_subject IS NULL OR length(rendered_subject) <= 500),
  rendered_body text NULL CHECK (rendered_body IS NULL OR length(rendered_body) <= 50000),
  rendered_sha256 char(64) NULL,
  provider_key varchar(100) NULL,
  provider_message_id varchar(255) NULL,
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 50),
  next_attempt_at timestamptz NULL,
  processing_started_at timestamptz NULL,
  delivered_at timestamptz NULL,
  blocked_at timestamptz NULL,
  failed_at timestamptz NULL,
  dead_lettered_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  last_error_code varchar(120) NULL,
  last_error_message text NULL CHECK (last_error_message IS NULL OR length(last_error_message) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE(notification_id, channel),
  CONSTRAINT notification_delivery_template_shape CHECK (
    (template_id IS NULL AND template_key IS NULL AND template_version IS NULL)
    OR (template_id IS NOT NULL AND template_key IS NOT NULL AND template_version IS NOT NULL)
  ),
  CONSTRAINT notification_delivery_retry_shape CHECK (
    (status='retry_wait' AND next_attempt_at IS NOT NULL)
    OR status<>'retry_wait'
  ),
  CONSTRAINT notification_delivery_terminal_timestamps CHECK (
    (status='delivered' AND delivered_at IS NOT NULL)
    OR (status='blocked' AND blocked_at IS NOT NULL)
    OR (status='failed' AND failed_at IS NOT NULL)
    OR (status='dead_lettered' AND dead_lettered_at IS NOT NULL)
    OR (status='cancelled' AND cancelled_at IS NOT NULL)
    OR status IN ('pending','processing','retry_wait')
  )
);
CREATE INDEX IF NOT EXISTS ix_notification_delivery_worker
  ON notifications.deliveries(status,next_attempt_at,created_at,id)
  WHERE status IN ('pending','retry_wait');
CREATE INDEX IF NOT EXISTS ix_notification_delivery_notification
  ON notifications.deliveries(notification_id,created_at,id);
CREATE INDEX IF NOT EXISTS ix_notification_delivery_provider_message
  ON notifications.deliveries(provider_key,provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notifications.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES notifications.deliveries(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  provider_key varchar(100) NULL,
  status varchar(30) NOT NULL CHECK (status IN ('started','succeeded','retryable_failed','permanent_failed','blocked')),
  error_code varchar(120) NULL,
  error_message text NULL CHECK (error_message IS NULL OR length(error_message) <= 4000),
  provider_message_id varchar(255) NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata)='object'),
  UNIQUE(delivery_id,attempt_no),
  CONSTRAINT delivery_attempt_finish_shape CHECK (
    (status='started' AND finished_at IS NULL)
    OR (status<>'started' AND finished_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS ix_delivery_attempts_delivery
  ON notifications.delivery_attempts(delivery_id,attempt_no DESC);

CREATE TABLE IF NOT EXISTS notifications.in_app_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL UNIQUE REFERENCES notifications.deliveries(id) ON DELETE CASCADE,
  recipient_subject_type varchar(30) NOT NULL CHECK (recipient_subject_type IN ('customer','staff')),
  recipient_subject_id varchar(200) NOT NULL,
  title varchar(500) NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 50000),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
  read_at timestamptz NULL,
  acknowledged_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_in_app_receipts_recipient_created
  ON notifications.in_app_receipts(recipient_subject_type,recipient_subject_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_in_app_receipts_recipient_unread
  ON notifications.in_app_receipts(recipient_subject_type,recipient_subject_id,created_at DESC,id)
  WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION notifications.guard_delivery_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_terminal boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF NEW.retry_count < OLD.retry_count THEN
    RAISE EXCEPTION 'NOTIFICATION_RETRY_COUNT_DECREASE';
  END IF;
  IF NEW.status = OLD.status THEN
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  old_terminal := OLD.status IN ('delivered','dead_lettered','cancelled');
  IF old_terminal THEN
    RAISE EXCEPTION 'NOTIFICATION_DELIVERY_TERMINAL';
  END IF;
  IF NOT (
    (OLD.status='pending' AND NEW.status IN ('processing','blocked','cancelled')) OR
    (OLD.status='processing' AND NEW.status IN ('delivered','retry_wait','blocked','failed','dead_lettered','cancelled')) OR
    (OLD.status='retry_wait' AND NEW.status IN ('processing','blocked','dead_lettered','cancelled')) OR
    (OLD.status='blocked' AND NEW.status IN ('pending','processing','dead_lettered','cancelled')) OR
    (OLD.status='failed' AND NEW.status IN ('pending','dead_lettered','cancelled'))
  ) THEN
    RAISE EXCEPTION 'NOTIFICATION_DELIVERY_INVALID_TRANSITION:%->%', OLD.status, NEW.status;
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notification_delivery_transition ON notifications.deliveries;
CREATE TRIGGER trg_notification_delivery_transition
BEFORE UPDATE ON notifications.deliveries
FOR EACH ROW EXECUTE FUNCTION notifications.guard_delivery_transition();

CREATE OR REPLACE FUNCTION notifications.guard_intent_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('delivered','dead_lettered','cancelled') THEN
    RAISE EXCEPTION 'NOTIFICATION_INTENT_TERMINAL';
  END IF;
  IF NOT (
    (OLD.status='queued' AND NEW.status IN ('processing','cancelled')) OR
    (OLD.status='processing' AND NEW.status IN ('partially_delivered','delivered','failed','dead_lettered','cancelled')) OR
    (OLD.status='partially_delivered' AND NEW.status IN ('processing','delivered','failed','dead_lettered','cancelled')) OR
    (OLD.status='failed' AND NEW.status IN ('processing','dead_lettered','cancelled'))
  ) THEN
    RAISE EXCEPTION 'NOTIFICATION_INTENT_INVALID_TRANSITION:%->%', OLD.status, NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notification_intent_transition ON notifications.notification_intents;
CREATE TRIGGER trg_notification_intent_transition
BEFORE UPDATE ON notifications.notification_intents
FOR EACH ROW EXECUTE FUNCTION notifications.guard_intent_transition();

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
('notifications.view','notifications','مشاهده اعلان‌ها و وضعیت ارسال','normal'),
('notifications.retry','notifications','تلاش مجدد ارسال اعلان','high'),
('notifications.templates.view','notifications','مشاهده قالب‌های اعلان','normal'),
('notifications.templates.manage','notifications','مدیریت قالب‌های اعلان','high'),
('notifications.operations.manage','notifications','مدیریت عملیاتی اعلان‌ها','critical')
ON CONFLICT(key) DO NOTHING;

COMMIT;
