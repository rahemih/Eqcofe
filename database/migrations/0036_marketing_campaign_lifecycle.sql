BEGIN;

-- EQCOFE Step 46 / A4 — Campaign lifecycle hardening.
-- Additive follow-up to A3. Align persistence with the A2 domain lifecycle and
-- enforce legal state transitions at the database boundary.

ALTER TABLE marketing.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE marketing.campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK(status IN ('draft','active','paused','ended','archived'));

ALTER TABLE marketing.campaigns
  ADD COLUMN IF NOT EXISTS created_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS updated_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE OR REPLACE FUNCTION marketing.guard_campaign_lifecycle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'CAMPAIGN_DELETE_FORBIDDEN';
  END IF;

  IF TG_OP='UPDATE' THEN
    IF OLD.id<>NEW.id THEN RAISE EXCEPTION 'CAMPAIGN_ID_IMMUTABLE'; END IF;
    IF OLD.status='archived' THEN RAISE EXCEPTION 'CAMPAIGN_ARCHIVED_IMMUTABLE'; END IF;

    IF OLD.status<>NEW.status AND NOT (
      (OLD.status='draft' AND NEW.status IN ('active','ended','archived')) OR
      (OLD.status='active' AND NEW.status IN ('paused','ended')) OR
      (OLD.status='paused' AND NEW.status IN ('active','ended','archived')) OR
      (OLD.status='ended' AND NEW.status='archived')
    ) THEN
      RAISE EXCEPTION 'CAMPAIGN_INVALID_TRANSITION:%->%', OLD.status, NEW.status;
    END IF;

    IF NEW.status='active' AND now()>=NEW.ends_at THEN
      RAISE EXCEPTION 'CAMPAIGN_ENDED';
    END IF;

    IF (OLD.starts_at<>NEW.starts_at OR OLD.ends_at<>NEW.ends_at)
       AND OLD.status NOT IN ('draft','paused') THEN
      RAISE EXCEPTION 'CAMPAIGN_RESCHEDULE_INVALID';
    END IF;
  END IF;

  IF NEW.starts_at>=NEW.ends_at THEN RAISE EXCEPTION 'CAMPAIGN_INVALID_WINDOW'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_marketing_campaign_lifecycle ON marketing.campaigns;
CREATE TRIGGER trg_marketing_campaign_lifecycle
BEFORE UPDATE OR DELETE ON marketing.campaigns
FOR EACH ROW EXECUTE FUNCTION marketing.guard_campaign_lifecycle();

CREATE INDEX IF NOT EXISTS ix_marketing_campaigns_active_end
  ON marketing.campaigns(ends_at,id) WHERE status='active';

COMMIT;
