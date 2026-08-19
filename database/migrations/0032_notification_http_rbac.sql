BEGIN;

ALTER TABLE notifications.templates
  ADD COLUMN IF NOT EXISTS name_fa varchar(200) NULL;

CREATE OR REPLACE FUNCTION notifications.guard_delivery_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  manual_retry boolean := COALESCE(current_setting('eqcofe.notification_manual_retry', true), '') = '1';
BEGIN
  IF NEW.retry_count < OLD.retry_count THEN
    RAISE EXCEPTION 'NOTIFICATION_RETRY_COUNT_DECREASE';
  END IF;
  IF OLD.status IN ('delivered','dead_lettered','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (manual_retry AND OLD.status='dead_lettered' AND NEW.status='pending') THEN
      RAISE EXCEPTION 'NOTIFICATION_DELIVERY_TERMINAL';
    END IF;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status='pending' AND NEW.status IN ('processing','blocked','cancelled')) OR
    (OLD.status='processing' AND NEW.status IN ('delivered','retry_wait','blocked','failed','dead_lettered','cancelled')) OR
    (OLD.status='retry_wait' AND NEW.status IN ('processing','blocked','cancelled')) OR
    (OLD.status='blocked' AND NEW.status IN ('pending','cancelled')) OR
    (OLD.status='failed' AND NEW.status IN ('pending','cancelled')) OR
    (manual_retry AND OLD.status='dead_lettered' AND NEW.status='pending')
  ) THEN RAISE EXCEPTION 'NOTIFICATION_DELIVERY_TRANSITION_INVALID'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION notifications.guard_intent_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  manual_retry boolean := COALESCE(current_setting('eqcofe.notification_manual_retry', true), '') = '1';
BEGIN
  IF OLD.status IN ('delivered','dead_lettered','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (manual_retry AND OLD.status='dead_lettered' AND NEW.status='queued') THEN
      RAISE EXCEPTION 'NOTIFICATION_INTENT_TERMINAL';
    END IF;
  END IF;
  RETURN NEW;
END $$;

COMMIT;
