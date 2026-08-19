BEGIN;

-- Step 46 / A8 runtime hardening for trigger edge cases discovered during audit.

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
    PERFORM pg_advisory_xact_lock(hashtextextended('marketing-promotion:'||(app->>'promotionId'),46));
    SELECT * INTO p FROM marketing.promotions WHERE id=(app->>'promotionId')::uuid FOR UPDATE;
    IF NOT FOUND OR NOT p.enabled OR now_at<p.starts_at OR now_at>=p.ends_at THEN RAISE EXCEPTION 'MARKETING_PROMOTION_NOT_RESERVABLE'; END IF;
    SELECT * INTO camp FROM marketing.campaigns WHERE id=p.campaign_id FOR UPDATE;
    IF NOT FOUND OR camp.id<>(app->>'campaignId')::uuid OR camp.status<>'active' OR now_at<camp.starts_at OR now_at>=camp.ends_at THEN RAISE EXCEPTION 'MARKETING_CAMPAIGN_NOT_RESERVABLE'; END IF;

    SELECT count(*) INTO total_used FROM marketing.redemptions WHERE promotion_id=p.id AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
    IF p.total_usage_limit IS NOT NULL AND total_used>=p.total_usage_limit THEN RAISE EXCEPTION 'MARKETING_PROMOTION_TOTAL_LIMIT_REACHED'; END IF;
    IF p.per_customer_usage_limit IS NOT NULL THEN
      IF NEW.customer_id IS NULL THEN RAISE EXCEPTION 'MARKETING_PROMOTION_CUSTOMER_REQUIRED'; END IF;
      SELECT count(*) INTO customer_used FROM marketing.redemptions WHERE promotion_id=p.id AND customer_id=NEW.customer_id AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
      IF customer_used>=p.per_customer_usage_limit THEN RAISE EXCEPTION 'MARKETING_PROMOTION_CUSTOMER_LIMIT_REACHED'; END IF;
    END IF;

    IF p.first_purchase_only THEN
      IF NEW.customer_id IS NULL THEN RAISE EXCEPTION 'MARKETING_FIRST_PURCHASE_CUSTOMER_REQUIRED'; END IF;
      PERFORM pg_advisory_xact_lock(hashtextextended('marketing-first-purchase:'||NEW.customer_id::text,46));
      IF EXISTS(SELECT 1 FROM orders.orders WHERE customer_id=NEW.customer_id AND payment_status='paid') THEN RAISE EXCEPTION 'MARKETING_FIRST_PURCHASE_ALREADY_COMPLETED'; END IF;
      IF EXISTS(
        SELECT 1 FROM marketing.redemptions r JOIN marketing.promotions fp ON fp.id=r.promotion_id AND fp.first_purchase_only
        WHERE r.customer_id=NEW.customer_id AND r.checkout_id<>NEW.id AND r.status IN ('reserved','consumed')
      ) THEN RAISE EXCEPTION 'MARKETING_FIRST_PURCHASE_ALREADY_RESERVED'; END IF;
    END IF;

    IF app->>'source'='coupon' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('marketing-coupon:'||(app->>'couponId'),46));
      SELECT * INTO cp FROM marketing.coupons WHERE id=(app->>'couponId')::uuid FOR UPDATE;
      IF NOT FOUND OR cp.promotion_id<>p.id OR NOT cp.enabled OR now_at<cp.starts_at OR now_at>=cp.ends_at THEN RAISE EXCEPTION 'MARKETING_COUPON_NOT_RESERVABLE'; END IF;
      SELECT count(*) INTO coupon_total FROM marketing.redemptions WHERE coupon_id=cp.id AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
      IF cp.total_usage_limit IS NOT NULL AND coupon_total>=cp.total_usage_limit THEN RAISE EXCEPTION 'MARKETING_COUPON_TOTAL_LIMIT_REACHED'; END IF;
      IF cp.per_customer_usage_limit IS NOT NULL THEN
        IF NEW.customer_id IS NULL THEN RAISE EXCEPTION 'MARKETING_COUPON_CUSTOMER_REQUIRED'; END IF;
        SELECT count(*) INTO coupon_customer FROM marketing.redemptions WHERE coupon_id=cp.id AND customer_id=NEW.customer_id AND status IN ('reserved','consumed') AND checkout_id<>NEW.id;
        IF coupon_customer>=cp.per_customer_usage_limit THEN RAISE EXCEPTION 'MARKETING_COUPON_CUSTOMER_LIMIT_REACHED'; END IF;
      END IF;
    END IF;

    INSERT INTO marketing.redemptions(id,promotion_id,coupon_id,customer_id,checkout_id,discount_toman,status,reserved_at,version)
    VALUES(gen_random_uuid(),p.id,CASE WHEN app->>'source'='coupon' THEN (app->>'couponId')::uuid ELSE NULL END,NEW.customer_id,NEW.id,(app->>'discountToman')::bigint,'reserved',now_at,1);
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION marketing.assert_redemption_financial_integrity(p_checkout uuid,p_order uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c record; o record; matched_sum bigint; matched_count integer; app_count integer;
BEGIN
  IF p_checkout IS NOT NULL THEN
    SELECT status,marketing_discount_toman,marketing_snapshot INTO c FROM cart.checkouts WHERE id=p_checkout;
    IF FOUND THEN
      PERFORM marketing.assert_checkout_snapshot_shape(p_checkout);
      app_count:=jsonb_array_length(c.marketing_snapshot->'applications');
      IF c.status='reserved' THEN
        SELECT COALESCE(sum(discount_toman),0),count(*) INTO matched_sum,matched_count
        FROM marketing.redemptions WHERE checkout_id=p_checkout AND status IN ('reserved','consumed');
        IF matched_sum<>c.marketing_discount_toman OR matched_count<>app_count THEN RAISE EXCEPTION 'MARKETING_CHECKOUT_REDEMPTION_MISMATCH'; END IF;
      ELSIF c.status='order_created' THEN
        SELECT COALESCE(sum(discount_toman),0),count(*) INTO matched_sum,matched_count
        FROM marketing.redemptions WHERE checkout_id=p_checkout AND status IN ('consumed','reversed');
        IF matched_sum<>c.marketing_discount_toman OR matched_count<>app_count THEN RAISE EXCEPTION 'MARKETING_CHECKOUT_REDEMPTION_MISMATCH'; END IF;
      ELSIF c.status IN ('expired','cancelled') THEN
        SELECT count(*) INTO matched_count FROM marketing.redemptions WHERE checkout_id=p_checkout AND status IN ('reserved','consumed');
        IF matched_count<>0 THEN RAISE EXCEPTION 'MARKETING_TERMINAL_CHECKOUT_HAS_ACTIVE_REDEMPTION'; END IF;
      END IF;
    END IF;
  END IF;

  IF p_order IS NOT NULL THEN
    SELECT status,marketing_discount_toman,marketing_snapshot INTO o FROM orders.orders WHERE id=p_order;
    IF FOUND THEN
      app_count:=jsonb_array_length(o.marketing_snapshot->'applications');
      IF o.status IN ('cancelled','expired') THEN
        SELECT COALESCE(sum(discount_toman),0),count(*) INTO matched_sum,matched_count FROM marketing.redemptions WHERE order_id=p_order AND status='reversed';
      ELSE
        SELECT COALESCE(sum(discount_toman),0),count(*) INTO matched_sum,matched_count FROM marketing.redemptions WHERE order_id=p_order AND status='consumed';
      END IF;
      IF matched_sum<>o.marketing_discount_toman OR matched_count<>app_count THEN RAISE EXCEPTION 'MARKETING_ORDER_FINANCIAL_MISMATCH'; END IF;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION marketing.trg_assert_redemption_financial_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE checkout_key uuid; order_key uuid;
BEGIN
  IF TG_OP='DELETE' THEN checkout_key:=OLD.checkout_id; order_key:=OLD.order_id;
  ELSE checkout_key:=NEW.checkout_id; order_key:=NEW.order_id;
  END IF;
  PERFORM marketing.assert_redemption_financial_integrity(checkout_key,order_key);
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

COMMIT;
