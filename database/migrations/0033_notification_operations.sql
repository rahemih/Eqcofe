BEGIN;

ALTER TABLE notifications.notification_intents
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS ix_notification_intents_schedule
  ON notifications.notification_intents(scheduled_at, priority DESC, created_at, id)
  WHERE status='queued' AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_notification_delivery_processing_started
  ON notifications.deliveries(processing_started_at, id)
  WHERE status='processing';

COMMIT;
