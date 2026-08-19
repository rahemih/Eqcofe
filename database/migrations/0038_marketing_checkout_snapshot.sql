BEGIN;

ALTER TABLE cart.checkouts
  ADD COLUMN IF NOT EXISTS marketing_discount_toman bigint NOT NULL DEFAULT 0 CHECK(marketing_discount_toman>=0),
  ADD COLUMN IF NOT EXISTS marketing_snapshot jsonb NOT NULL DEFAULT '{"applications":[]}'::jsonb CHECK(jsonb_typeof(marketing_snapshot)='object');

ALTER TABLE orders.orders
  ADD COLUMN IF NOT EXISTS marketing_discount_toman bigint NOT NULL DEFAULT 0 CHECK(marketing_discount_toman>=0),
  ADD COLUMN IF NOT EXISTS marketing_snapshot jsonb NOT NULL DEFAULT '{"applications":[]}'::jsonb CHECK(jsonb_typeof(marketing_snapshot)='object');

ALTER TABLE cart.checkouts DROP CONSTRAINT IF EXISTS ck_checkout_marketing_discount_within_total;
ALTER TABLE cart.checkouts ADD CONSTRAINT ck_checkout_marketing_discount_within_total CHECK(marketing_discount_toman<=discount_toman AND discount_toman<=subtotal_toman);
ALTER TABLE orders.orders DROP CONSTRAINT IF EXISTS ck_order_marketing_discount_within_total;
ALTER TABLE orders.orders ADD CONSTRAINT ck_order_marketing_discount_within_total CHECK(marketing_discount_toman<=discount_toman AND discount_toman<=subtotal_toman);

CREATE OR REPLACE FUNCTION cart.assert_checkout_totals(p_checkout uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE h cart.checkouts%ROWTYPE; s record;
BEGIN
 SELECT * INTO h FROM cart.checkouts WHERE id=p_checkout; IF NOT FOUND THEN RETURN; END IF;
 SELECT COALESCE(sum(unit_base_toman*quantity),0) subtotal,COALESCE(sum(discount_toman),0) pricing_discount,COALESCE(sum(tax_toman),0) tax,COUNT(*) cnt INTO s FROM cart.checkout_items WHERE checkout_id=p_checkout;
 IF s.cnt=0 OR h.subtotal_toman<>s.subtotal OR h.discount_toman<>s.pricing_discount+h.marketing_discount_toman OR h.tax_toman<>s.tax OR h.total_toman<>s.subtotal-h.discount_toman+s.tax+h.shipping_toman THEN RAISE EXCEPTION 'CHECKOUT_TOTAL_MISMATCH'; END IF;
END $$;

CREATE OR REPLACE FUNCTION orders.copy_marketing_snapshot_from_checkout() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record;
BEGIN
 SELECT marketing_discount_toman,marketing_snapshot INTO c FROM cart.checkouts WHERE id=NEW.checkout_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_NOT_FOUND'; END IF;
 NEW.marketing_discount_toman:=c.marketing_discount_toman;
 NEW.marketing_snapshot:=c.marketing_snapshot;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_order_copy_marketing_snapshot ON orders.orders;
CREATE TRIGGER trg_order_copy_marketing_snapshot BEFORE INSERT OR UPDATE OF checkout_id ON orders.orders FOR EACH ROW EXECUTE FUNCTION orders.copy_marketing_snapshot_from_checkout();

CREATE OR REPLACE FUNCTION orders.assert_order_totals(p_order uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE h orders.orders%ROWTYPE; s record;
BEGIN
 SELECT * INTO h FROM orders.orders WHERE id=p_order; IF NOT FOUND THEN RETURN; END IF;
 SELECT COALESCE(sum(unit_base_toman*quantity),0) subtotal,COALESCE(sum(discount_toman),0) pricing_discount,COALESCE(sum(tax_toman),0) tax,COUNT(*) cnt INTO s FROM orders.order_items WHERE order_id=p_order;
 IF s.cnt=0 OR h.subtotal_toman<>s.subtotal OR h.discount_toman<>s.pricing_discount+h.marketing_discount_toman OR h.tax_toman<>s.tax OR h.total_toman<>s.subtotal-h.discount_toman+s.tax+h.shipping_toman THEN RAISE EXCEPTION 'ORDER_TOTAL_MISMATCH'; END IF;
END $$;

COMMIT;
