BEGIN;

-- EQCOFE Step 46 / A8 — Order + Redemption + Financial Integrity.
-- Redemption is Marketing-owned. Checkout/Order state transitions are the atomic
-- transaction boundaries; no external call is introduced by these triggers.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_marketing_redemption_checkout') THEN
    ALTER TABLE marketing.redemptions
      ADD CONSTRAINT fk_marketing_redemption_checkout
      FOREIGN KEY(checkout_id) REFERENCES cart.checkouts(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_marketing_redemption_order') THEN
    ALTER TABLE marketing.redemptions
      ADD CONSTRAINT fk_marketing_redemption_order
      FOREIGN KEY(order_id) REFERENCES orders.orders(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE marketing.redemptions
  DROP CONSTRAINT IF EXISTS ck_marketing_redemption_positive_discount;
ALTER TABLE marketing.redemptions
  ADD CONSTRAINT ck_marketing_redemption_positive_discount CHECK(discount_toman>0);

CREATE INDEX IF NOT EXISTS ix_marketing_redemptions_checkout_status
  ON marketing.redemptions(checkout_id,status,id);
CREATE INDEX IF NOT EXISTS ix_marketing_redemptions_order_status
  ON marketing.redemptions(order_id,status,id) WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION marketing.assert_checkout_snapshot_shape(p_checkout uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c record; app jsonb; app_sum bigint:=0; pricing_net bigint; app_count integer:=0; distinct_promotions integer:=0;
BEGIN
  SELECT id,subtotal_toman,discount_toman,marketing_discount_toman,marketing_snapshot
    INTO c FROM cart.checkouts WHERE id=p_checkout;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_NOT_FOUND'; END IF;
  IF jsonb_typeof(c.marketing_snapshot)<>'object'
     OR jsonb_typeof(c.marketing_snapshot->'applications')<>'array' THEN
    RAISE EXCEPTION 'MARKETING_SNAPSHOT_INVALID';
  END IF;
  IF COALESCE(c.marketing_snapshot->>'pricing_net_toman','') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'MARKETING_SNAPSHOT_INVALID';
  END IF;
  pricing_net:=(c.marketing_snapshot->>'pricing_net_toman')::bigint;
  IF pricing_net<>c.subtotal_toman-(c.discount_toman-c.marketing_discount_toman) THEN
    RAISE EXCEPTION 'MARKETING_PRICING_NET_MISMATCH';
  END IF;

  FOR app IN SELECT value FROM jsonb_array_elements(c.marketing_snapshot->'applications') LOOP
    app_count:=app_count+1;
    IF COALESCE(app->>'source','') NOT IN ('automatic','coupon')
       OR COALESCE(app->>'promotionId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR COALESCE(app->>'campaignId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR COALESCE(app->>'discountToman','') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'MARKETING_SNAPSHOT_INVALID';
    END IF;
    IF app->>'source'='coupon' AND COALESCE(app->>'couponId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'MARKETING_COUPON_SNAPSHOT_INVALID';
    END IF;
    IF app->>'source'='automatic' AND app ? 'couponId' THEN
      RAISE EXCEPTION 'MARKETING_AUTOMATIC_COUPON_INVALID';
    END IF;
    app_sum:=app_sum+(app->>'discountToman')::bigint;
  END LOOP;

  SELECT count(DISTINCT value->>'promotionId') INTO distinct_promotions
  FROM jsonb_array_elements(c.marketing_snapshot->'applications');
  IF distinct_promotions<>app_count THEN RAISE EXCEPTION 'MARKETING_DUPLICATE_PROMOTION_SNAPSHOT'; END IF;
  IF app_sum<>c.marketing_discount_toman THEN RAISE EXCEPTION 'MARKETING_SNAPSHOT_DISCOUNT_MISMATCH'; END IF;
  IF c.marketing_discount_toman>pricing_net THEN RAISE EXCEPTION 'MARKETING_DISCOUNT_EXCEEDS_PRICING_NET'; END IF;
END $$;

CREATE OR REPLACE FUNCTION marketing.guard_redemption_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.promotion_id<>OLD.promotion_id
     OR NEW.coupon_id IS DISTINCT FROM OLD.coupon_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.checkout_id<>OLD.checkout_id
     OR NEW.discount_toman<>OLD.discount_toman
     OR NEW.reserved_at<>OLD.reserved_at
     OR NEW.created_at<>OLD.created_at THEN
    RAISE EXCEPTION 'MARKETING_REDEMPTION_FACT_IMMUTABLE';
  END IF;
  IF NEW.status=OLD.status THEN
    IF NEW.order_id IS DISTINCT FROM OLD.order_id
       OR NEW.consumed_at IS DISTINCT FROM OLD.consumed_at
       OR NEW.released_at IS DISTINCT FROM OLD.released_at
       OR NEW.reversed_at IS DISTINCT FROM OLD.reversed_at THEN
      RAISE EXCEPTION 'MARKETING_REDEMPTION_STATE_IMMUTABLE';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.status='reserved' AND NEW.status IN ('consumed','released'))
    OR (OLD.status='consumed' AND NEW.status='reversed')
  ) THEN
    RAISE EXCEPTION 'MARKETING_REDEMPTION_INVALID_TRANSITION';
  END IF;
  IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'MARKETING_REDEMPTION_VERSION_MISMATCH'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketing_redemption_update_guard ON marketing.redemptions;
CREATE TRIGGER trg_marketing_redemption_update_guard
BEFORE UPDATE ON marketing.redemptions
FOR EACH ROW EXECUTE FUNCTION marketing.guard_redemption_update();

CREATE OR REPLACE FUNCTION marketing.reserve_checkout_redemptions()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE app jsonb; p record; cp record; camp record; total_used bigint; customer_used bigint; coupon_total bigint; coupon_customer bigint; now_at timestamptz:=now();
BEGIN
  IF NEW.status<>'reserved' OR OLD.status='reserved' THEN RETURN NEW; END IF;
  IF OLD.status<>'quoted' THEN RAISE EXCEPTION 'MARKETING_CHECKOUT_RESERVE_INVALID_STATE'; END IF;
  PERFORM marketing.assert_checkout_snapshot_shape(NEW.id);

  FOR app IN
    SELECT value FROM jsonb_array_elements(NEW.marketing_snapshot->'applications')
    ORDER BY value->>'promotionId',COALESCE(value->>'couponId','')
  LOOP
    -- Serialize each promotion limit. First-purchase also serializes per customer below.
    PERFORM pg_advisory_xact_lock(hashtextextended('marketing-promotion:'||(app->>'promotionId'),46));
    SELECT * INTO p FROM marketing.promotions WHERE id=(app->>'promotionId')::uuid FOR UPDATE;
    IF NOT FOUND OR NOT p.enabled OR now_at<p.starts_at OR now_at>=p.ends_at THEN
      RAISE EXCEPTION 'MARKETING_PROMOTION_NOT_RESERVABLE';
    END IF;
    SELECT * INTO camp FROM marketing.campaigns WHERE id=p.campaign_id FOR UPDATE;
    IF NOT FOUND OR camp.id<>(app->>'campaignId')::uuid OR camp.status<>'active' OR now_at<camp.starts_at OR now_at>=camp.ends_at THEN
      RAISE EXCEPTION 'MARKETING_CAMPAIGN_NOT_RESERVABLE';
    END IF;

    SELECT count(*) INTO total_used FROM marketing.redemptions
      WHERE promotion_id=p.id AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
    IF p.total_usage_limit IS NOT NULL AND total_used>=p.total_usage_limit THEN
      RAISE EXCEPTION 'MARKETING_PROMOTION_TOTAL_LIMIT_REACHED';
    END IF;
    IF p.per_customer_usage_limit IS NOT NULL THEN
      IF NEW.customer_id IS NULL THEN RAISE EXCEPTION 'MARKETING_PROMOTION_CUSTOMER_REQUIRED'; END IF;
      SELECT count(*) INTO customer_used FROM marketing.redemptions
        WHERE promotion_id=p.id AND customer_id=NEW.customer_id
          AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
      IF customer_used>=p.per_customer_usage_limit THEN
        RAISE EXCEPTION 'MARKETING_PROMOTION_CUSTOMER_LIMIT_REACHED';
      END IF;
    END IF;

    IF p.first_purchase_only THEN
      IF NEW.customer_id IS NULL THEN RAISE EXCEPTION 'MARKETING_FIRST_PURCHASE_CUSTOMER_REQUIRED'; END IF;
      PERFORM pg_advisory_xact_lock(hashtextextended('marketing-first-purchase:'||NEW.customer_id::text,46));
      IF EXISTS(SELECT 1 FROM orders.orders WHERE customer_id=NEW.customer_id AND payment_status='paid') THEN
        RAISE EXCEPTION 'MARKETING_FIRST_PURCHASE_ALREADY_COMPLETED';
      END IF;
      IF EXISTS(
        SELECT 1 FROM marketing.redemptions r
        JOIN marketing.promotions fp ON fp.id=r.promotion_id AND fp.first_purchase_only
        WHERE r.customer_id=NEW.customer_id AND r.checkout_id<>NEW.id AND r.status IN ('reserved','consumed')
      ) THEN
        RAISE EXCEPTION 'MARKETING_FIRST_PURCHASE_ALREADY_RESERVED';
      END IF;
    END IF;

    cp:=NULL;
    IF app->>'source'='coupon' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('marketing-coupon:'||(app->>'couponId'),46));
      SELECT * INTO cp FROM marketing.coupons WHERE id=(app->>'couponId')::uuid FOR UPDATE;
      IF NOT FOUND OR cp.promotion_id<>p.id OR NOT cp.enabled OR now_at<cp.starts_at OR now_at>=cp.ends_at THEN
        RAISE EXCEPTION 'MARKETING_COUPON_NOT_RESERVABLE';
      END IF;
      SELECT count(*) INTO coupon_total FROM marketing.redemptions
        WHERE coupon_id=cp.id AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
      IF cp.total_usage_limit IS NOT NULL AND coupon_total>=cp.total_usage_limit THEN
        RAISE EXCEPTION 'MARKETING_COUPON_TOTAL_LIMIT_REACHED';
      END IF;
      IF cp.per_customer_usage_limit IS NOT NULL THEN
        IF NEW.customer_id IS NULL THEN RAISE EXCEPTION 'MARKETING_COUPON_CUSTOMER_REQUIRED'; END IF;
        SELECT count(*) INTO coupon_customer FROM marketing.redemptions
          WHERE coupon_id=cp.id AND customer_id=NEW.customer_id
            AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
        IF coupon_customer>=cp.per_customer_usage_limit THEN
          RAISE EXCEPTION 'MARKETING_COUPON_CUSTOMER_LIMIT_REACHED';
        END IF;
      END IF;
    END IF;

    INSERT INTO marketing.redemptions(
      id,promotion_id,coupon_id,customer_id,checkout_id,discount_toman,status,reserved_at,version
    ) VALUES(
      gen_random_uuid(),p.id,
      CASE WHEN app->>'source'='coupon' THEN (app->>'couponId')::uuid ELSE NULL END,
      NEW.customer_id,NEW.id,(app->>'discountToman')::bigint,'reserved',now_at,1
    );
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketing_reserve_on_checkout ON cart.checkouts;
CREATE TRIGGER trg_marketing_reserve_on_checkout
AFTER UPDATE OF status ON cart.checkouts
FOR EACH ROW WHEN (NEW.status='reserved' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION marketing.reserve_checkout_redemptions();

CREATE OR REPLACE FUNCTION marketing.release_checkout_redemptions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='reserved' AND NEW.status IN ('expired','cancelled') THEN
    UPDATE marketing.redemptions
      SET status='released',released_at=now(),updated_at=now(),version=version+1
      WHERE checkout_id=NEW.id AND status='reserved';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketing_release_on_checkout ON cart.checkouts;
CREATE TRIGGER trg_marketing_release_on_checkout
AFTER UPDATE OF status ON cart.checkouts
FOR EACH ROW EXECUTE FUNCTION marketing.release_checkout_redemptions();

CREATE OR REPLACE FUNCTION marketing.consume_order_redemptions()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_count integer; consumed_count integer; expected_sum bigint; consumed_sum bigint;
BEGIN
  PERFORM marketing.assert_checkout_snapshot_shape(NEW.checkout_id);
  SELECT jsonb_array_length(NEW.marketing_snapshot->'applications'),NEW.marketing_discount_toman
    INTO expected_count,expected_sum;

  UPDATE marketing.redemptions
    SET status='consumed',order_id=NEW.id,consumed_at=now(),updated_at=now(),version=version+1
    WHERE checkout_id=NEW.checkout_id AND status='reserved';

  SELECT count(*),COALESCE(sum(discount_toman),0) INTO consumed_count,consumed_sum
    FROM marketing.redemptions WHERE checkout_id=NEW.checkout_id AND order_id=NEW.id AND status='consumed';
  IF consumed_count<>expected_count OR consumed_sum<>expected_sum THEN
    RAISE EXCEPTION 'MARKETING_ORDER_REDEMPTION_MISMATCH';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketing_consume_on_order ON orders.orders;
CREATE TRIGGER trg_marketing_consume_on_order
AFTER INSERT ON orders.orders
FOR EACH ROW EXECUTE FUNCTION marketing.consume_order_redemptions();

CREATE OR REPLACE FUNCTION marketing.reverse_order_redemptions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status NOT IN ('cancelled','expired') AND NEW.status IN ('cancelled','expired') THEN
    UPDATE marketing.redemptions
      SET status='reversed',reversed_at=now(),updated_at=now(),version=version+1
      WHERE order_id=NEW.id AND status='consumed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_marketing_reverse_on_order ON orders.orders;
CREATE TRIGGER trg_marketing_reverse_on_order
AFTER UPDATE OF status ON orders.orders
FOR EACH ROW EXECUTE FUNCTION marketing.reverse_order_redemptions();

CREATE OR REPLACE FUNCTION marketing.assert_redemption_financial_integrity(p_checkout uuid,p_order uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c record; o record; active_sum bigint; active_count integer; app_count integer; historical_sum bigint;
BEGIN
  IF p_checkout IS NOT NULL THEN
    SELECT status,marketing_discount_toman,marketing_snapshot INTO c FROM cart.checkouts WHERE id=p_checkout;
    IF FOUND THEN
      PERFORM marketing.assert_checkout_snapshot_shape(p_checkout);
      app_count:=jsonb_array_length(c.marketing_snapshot->'applications');
      SELECT COALESCE(sum(discount_toman),0),count(*) INTO active_sum,active_count
        FROM marketing.redemptions WHERE checkout_id=p_checkout AND status IN ('reserved','consumed');
      IF c.status IN ('reserved','order_created') AND (active_sum<>c.marketing_discount_toman OR active_count<>app_count) THEN
        RAISE EXCEPTION 'MARKETING_CHECKOUT_REDEMPTION_MISMATCH';
      END IF;
      IF c.status IN ('expired','cancelled') AND active_count<>0 THEN
        RAISE EXCEPTION 'MARKETING_TERMINAL_CHECKOUT_HAS_ACTIVE_REDEMPTION';
      END IF;
    END IF;
  END IF;

  IF p_order IS NOT NULL THEN
    SELECT status,checkout_id,marketing_discount_toman,marketing_snapshot INTO o FROM orders.orders WHERE id=p_order;
    IF FOUND THEN
      app_count:=jsonb_array_length(o.marketing_snapshot->'applications');
      IF o.status IN ('cancelled','expired') THEN
        SELECT COALESCE(sum(discount_toman),0),count(*) INTO historical_sum,active_count
          FROM marketing.redemptions WHERE order_id=p_order AND status='reversed';
      ELSE
        SELECT COALESCE(sum(discount_toman),0),count(*) INTO historical_sum,active_count
          FROM marketing.redemptions WHERE order_id=p_order AND status='consumed';
      END IF;
      IF historical_sum<>o.marketing_discount_toman OR active_count<>app_count THEN
        RAISE EXCEPTION 'MARKETING_ORDER_FINANCIAL_MISMATCH';
      END IF;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION marketing.trg_assert_redemption_financial_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM marketing.assert_redemption_financial_integrity(COALESCE(NEW.checkout_id,OLD.checkout_id),COALESCE(NEW.order_id,OLD.order_id));
  RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_marketing_redemption_financial_integrity ON marketing.redemptions;
CREATE CONSTRAINT TRIGGER trg_marketing_redemption_financial_integrity
AFTER INSERT OR UPDATE OR DELETE ON marketing.redemptions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION marketing.trg_assert_redemption_financial_integrity();

COMMIT;
