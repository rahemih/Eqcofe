BEGIN;

-- EQCOFE Step 46 / A3 — Marketing, Promotions & Customer Club persistence.
-- Additive only. Pricing remains authoritative for base prices; this schema stores
-- campaign/promotion/coupon eligibility, redemption state and non-cash points ledger.

CREATE TABLE IF NOT EXISTS marketing.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),
  description varchar(2000) NULL CHECK(description IS NULL OR length(btrim(description)) BETWEEN 1 AND 2000),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused','archived')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK(starts_at < ends_at)
);
CREATE INDEX IF NOT EXISTS ix_marketing_campaigns_status_window
  ON marketing.campaigns(status,starts_at,ends_at,id);

CREATE TABLE IF NOT EXISTS marketing.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing.campaigns(id) ON DELETE RESTRICT,
  name varchar(200) NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),
  kind varchar(30) NOT NULL CHECK(kind IN ('percentage','fixed_toman')),
  value integer NOT NULL CHECK(value > 0),
  max_discount_toman bigint NULL CHECK(max_discount_toman IS NULL OR max_discount_toman > 0),
  min_subtotal_toman bigint NULL CHECK(min_subtotal_toman IS NULL OR min_subtotal_toman >= 0),
  first_purchase_only boolean NOT NULL DEFAULT false,
  wholesale_allowed boolean NOT NULL DEFAULT false,
  total_usage_limit integer NULL CHECK(total_usage_limit IS NULL OR total_usage_limit > 0),
  per_customer_usage_limit integer NULL CHECK(per_customer_usage_limit IS NULL OR per_customer_usage_limit > 0),
  stacking varchar(20) NOT NULL DEFAULT 'exclusive' CHECK(stacking IN ('exclusive','stackable')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK(starts_at < ends_at),
  CHECK((kind='percentage' AND value BETWEEN 1 AND 100) OR (kind='fixed_toman' AND value > 0))
);
CREATE INDEX IF NOT EXISTS ix_marketing_promotions_campaign
  ON marketing.promotions(campaign_id,enabled,starts_at,ends_at,id);
CREATE INDEX IF NOT EXISTS ix_marketing_promotions_active_window
  ON marketing.promotions(enabled,starts_at,ends_at,id) WHERE enabled;

CREATE TABLE IF NOT EXISTS marketing.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES marketing.promotions(id) ON DELETE RESTRICT,
  code varchar(80) NOT NULL CHECK(code = upper(btrim(code)) AND length(code) BETWEEN 3 AND 80),
  enabled boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  total_usage_limit integer NULL CHECK(total_usage_limit IS NULL OR total_usage_limit > 0),
  per_customer_usage_limit integer NULL CHECK(per_customer_usage_limit IS NULL OR per_customer_usage_limit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK(starts_at < ends_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_coupon_code ON marketing.coupons(code);
CREATE INDEX IF NOT EXISTS ix_marketing_coupons_promotion ON marketing.coupons(promotion_id,enabled,id);

CREATE TABLE IF NOT EXISTS marketing.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES marketing.promotions(id) ON DELETE RESTRICT,
  coupon_id uuid NULL REFERENCES marketing.coupons(id) ON DELETE RESTRICT,
  customer_id uuid NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
  checkout_id uuid NOT NULL,
  order_id uuid NULL,
  discount_toman bigint NOT NULL CHECK(discount_toman >= 0),
  status varchar(20) NOT NULL CHECK(status IN ('reserved','consumed','released','reversed')),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz NULL,
  released_at timestamptz NULL,
  reversed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
  CONSTRAINT ck_marketing_redemption_state CHECK(
    (status='reserved' AND order_id IS NULL AND consumed_at IS NULL AND released_at IS NULL AND reversed_at IS NULL)
    OR (status='consumed' AND order_id IS NOT NULL AND consumed_at IS NOT NULL AND released_at IS NULL AND reversed_at IS NULL)
    OR (status='released' AND order_id IS NULL AND consumed_at IS NULL AND released_at IS NOT NULL AND reversed_at IS NULL)
    OR (status='reversed' AND order_id IS NOT NULL AND consumed_at IS NOT NULL AND released_at IS NULL AND reversed_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_redemption_promotion_checkout
  ON marketing.redemptions(promotion_id,checkout_id)
  WHERE status IN ('reserved','consumed');
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_redemption_coupon_checkout
  ON marketing.redemptions(coupon_id,checkout_id)
  WHERE coupon_id IS NOT NULL AND status IN ('reserved','consumed');
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_redemption_promotion_order
  ON marketing.redemptions(promotion_id,order_id)
  WHERE order_id IS NOT NULL AND status IN ('consumed','reversed');
CREATE INDEX IF NOT EXISTS ix_marketing_redemptions_customer_promotion
  ON marketing.redemptions(customer_id,promotion_id,status,created_at DESC,id)
  WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_marketing_redemptions_coupon_status
  ON marketing.redemptions(coupon_id,status,created_at DESC,id)
  WHERE coupon_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS loyalty.points_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
  entry_type varchar(20) NOT NULL CHECK(entry_type IN ('earn','redeem','expire','adjust')),
  points_delta bigint NOT NULL CHECK(points_delta <> 0),
  reference_type varchar(80) NOT NULL CHECK(length(btrim(reference_type)) BETWEEN 1 AND 80),
  reference_id varchar(200) NOT NULL CHECK(length(btrim(reference_id)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_loyalty_points_direction CHECK(
    (entry_type='earn' AND points_delta > 0)
    OR (entry_type IN ('redeem','expire') AND points_delta < 0)
    OR entry_type='adjust'
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_points_reference
  ON loyalty.points_entries(customer_id,entry_type,reference_type,reference_id);
CREATE INDEX IF NOT EXISTS ix_loyalty_points_customer_history
  ON loyalty.points_entries(customer_id,created_at DESC,id);

-- Database-level protection against a negative points balance under concurrent writes.
CREATE OR REPLACE FUNCTION loyalty.guard_non_negative_points_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_balance bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.customer_id::text, 46));
  SELECT COALESCE(sum(points_delta),0) INTO current_balance
  FROM loyalty.points_entries
  WHERE customer_id=NEW.customer_id;
  IF current_balance + NEW.points_delta < 0 THEN
    RAISE EXCEPTION 'LOYALTY_NEGATIVE_BALANCE';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_loyalty_non_negative_points_balance ON loyalty.points_entries;
CREATE TRIGGER trg_loyalty_non_negative_points_balance
BEFORE INSERT ON loyalty.points_entries
FOR EACH ROW EXECUTE FUNCTION loyalty.guard_non_negative_points_balance();

COMMIT;
