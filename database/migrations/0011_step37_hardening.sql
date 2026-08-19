-- Step 37 three-stage hardening: query indexes and cross-domain commitment integrity.

DROP INDEX IF EXISTS orders.ix_orders_customer_created;
CREATE INDEX IF NOT EXISTS ix_orders_customer_created_id ON orders.orders(customer_id,created_at DESC,id DESC) WHERE customer_id IS NOT NULL;
DROP INDEX IF EXISTS orders.ix_orders_pending_created;
CREATE INDEX IF NOT EXISTS ix_orders_pending_expiry_id ON orders.orders(confirmation_expires_at,id) WHERE status='pending_confirmation';
DROP INDEX IF EXISTS cart.ix_checkouts_expiry;
CREATE INDEX IF NOT EXISTS ix_checkouts_expiry_id ON cart.checkouts(expires_at,id) WHERE status IN ('quoted','reserved');
CREATE INDEX IF NOT EXISTS ix_carts_expiry_id ON cart.carts(expires_at,id) WHERE status='active';
CREATE INDEX IF NOT EXISTS ix_cart_access_tokens_cart_created ON cart.cart_access_tokens(cart_id,created_at DESC,id DESC);

CREATE OR REPLACE FUNCTION orders.assert_order_commitment_linkage(p_order uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE o orders.orders%ROWTYPE; c cart.checkouts%ROWTYPE; ca cart.carts%ROWTYPE; r inventory.reservations%ROWTYPE;
BEGIN
 SELECT * INTO o FROM orders.orders WHERE id=p_order; IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO c FROM cart.checkouts WHERE id=o.checkout_id;
 IF c.id IS NULL THEN RAISE EXCEPTION 'ORDER_CHECKOUT_NOT_FOUND'; END IF;
 SELECT * INTO ca FROM cart.carts WHERE id=c.cart_id;
 IF ca.id IS NULL THEN RAISE EXCEPTION 'ORDER_CART_NOT_FOUND'; END IF;
 SELECT * INTO r FROM inventory.reservations WHERE id=o.reservation_id;
 IF r.id IS NULL THEN RAISE EXCEPTION 'ORDER_RESERVATION_NOT_FOUND'; END IF;
 IF c.reservation_id IS DISTINCT FROM o.reservation_id THEN RAISE EXCEPTION 'ORDER_CHECKOUT_RESERVATION_MISMATCH'; END IF;
 IF c.customer_id IS DISTINCT FROM o.customer_id OR ca.customer_id IS DISTINCT FROM o.customer_id OR r.customer_id IS DISTINCT FROM o.customer_id THEN RAISE EXCEPTION 'ORDER_CUSTOMER_LINEAGE_MISMATCH'; END IF;
 IF r.cart_id IS DISTINCT FROM c.cart_id THEN RAISE EXCEPTION 'ORDER_RESERVATION_CART_MISMATCH'; END IF;
 IF r.order_id IS DISTINCT FROM o.id THEN RAISE EXCEPTION 'ORDER_RESERVATION_ORDER_MISMATCH'; END IF;
 IF c.status <> 'order_created' OR ca.status <> 'converted' THEN RAISE EXCEPTION 'ORDER_COMMERCE_COMMITMENT_NOT_FINALIZED'; END IF;
 IF ca.version IS DISTINCT FROM c.cart_version_snapshot + 1 THEN RAISE EXCEPTION 'ORDER_CART_VERSION_MISMATCH'; END IF;
 IF o.subtotal_toman IS DISTINCT FROM c.subtotal_toman OR o.discount_toman IS DISTINCT FROM c.discount_toman OR o.shipping_toman IS DISTINCT FROM c.shipping_toman OR o.tax_toman IS DISTINCT FROM c.tax_toman OR o.total_toman IS DISTINCT FROM c.total_toman THEN RAISE EXCEPTION 'ORDER_CHECKOUT_TOTAL_MISMATCH'; END IF;
 IF EXISTS(
   (SELECT product_id,variant_id,sku,product_name,quantity,unit_base_toman,unit_final_toman,discount_toman,tax_toman,tax_rule_id,line_total_toman,pricing_snapshot FROM orders.order_items WHERE order_id=o.id
    EXCEPT
    SELECT product_id,variant_id,sku,product_name,quantity,unit_base_toman,unit_final_toman,discount_toman,tax_toman,tax_rule_id,line_total_toman,pricing_snapshot FROM cart.checkout_items WHERE checkout_id=c.id)
   UNION ALL
   (SELECT product_id,variant_id,sku,product_name,quantity,unit_base_toman,unit_final_toman,discount_toman,tax_toman,tax_rule_id,line_total_toman,pricing_snapshot FROM cart.checkout_items WHERE checkout_id=c.id
    EXCEPT
    SELECT product_id,variant_id,sku,product_name,quantity,unit_base_toman,unit_final_toman,discount_toman,tax_toman,tax_rule_id,line_total_toman,pricing_snapshot FROM orders.order_items WHERE order_id=o.id)
 ) THEN RAISE EXCEPTION 'ORDER_CHECKOUT_ITEMS_MISMATCH'; END IF;
END $$;

CREATE OR REPLACE FUNCTION orders.trg_assert_order_commitment_linkage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM orders.assert_order_commitment_linkage(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_order_commitment_linkage ON orders.orders;
CREATE CONSTRAINT TRIGGER trg_order_commitment_linkage AFTER INSERT OR UPDATE OF checkout_id,reservation_id,customer_id ON orders.orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orders.trg_assert_order_commitment_linkage();
