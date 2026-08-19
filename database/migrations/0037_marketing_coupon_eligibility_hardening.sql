BEGIN;

-- EQCOFE Step 46 / A5 — Coupon + eligibility persistence hardening.
-- Additive only; previous migrations remain immutable.

ALTER TABLE marketing.coupons DROP CONSTRAINT IF EXISTS ck_marketing_coupon_code_format;
ALTER TABLE marketing.coupons ADD CONSTRAINT ck_marketing_coupon_code_format
  CHECK(code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$');

CREATE OR REPLACE FUNCTION marketing.assert_coupon_within_promotion_window()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record;
BEGIN
  SELECT starts_at,ends_at INTO p FROM marketing.promotions WHERE id=NEW.promotion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROMOTION_NOT_FOUND'; END IF;
  IF NEW.starts_at < p.starts_at OR NEW.ends_at > p.ends_at THEN
    RAISE EXCEPTION 'COUPON_OUTSIDE_PROMOTION_WINDOW';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketing_coupon_promotion_window ON marketing.coupons;
CREATE TRIGGER trg_marketing_coupon_promotion_window
BEFORE INSERT OR UPDATE OF promotion_id,starts_at,ends_at ON marketing.coupons
FOR EACH ROW EXECUTE FUNCTION marketing.assert_coupon_within_promotion_window();

CREATE INDEX IF NOT EXISTS ix_marketing_redemptions_promotion_active_usage
  ON marketing.redemptions(promotion_id,status,created_at,id)
  WHERE status IN ('reserved','consumed');
CREATE INDEX IF NOT EXISTS ix_marketing_redemptions_coupon_active_usage
  ON marketing.redemptions(coupon_id,status,created_at,id)
  WHERE coupon_id IS NOT NULL AND status IN ('reserved','consumed');

COMMIT;
