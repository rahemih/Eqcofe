CREATE SCHEMA IF NOT EXISTS cart;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS tax;

CREATE TABLE IF NOT EXISTS cart.carts (
 id uuid PRIMARY KEY,
 customer_id uuid NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','converted','expired')),
 token_hash char(64) NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at>created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_customer_cart ON cart.carts(customer_id) WHERE customer_id IS NOT NULL AND status='active';

CREATE TABLE IF NOT EXISTS cart.cart_access_tokens (
 id uuid PRIMARY KEY,
 cart_id uuid NOT NULL REFERENCES cart.carts(id) ON DELETE CASCADE,
 token_hash char(64) UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at>created_at)
);
CREATE INDEX IF NOT EXISTS ix_cart_access_tokens_cart_expiry ON cart.cart_access_tokens(cart_id,expires_at);

CREATE TABLE IF NOT EXISTS cart.cart_items (
 id uuid PRIMARY KEY,
 cart_id uuid NOT NULL REFERENCES cart.carts(id) ON DELETE CASCADE,
 variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
 quantity integer NOT NULL CHECK(quantity>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cart_id,variant_id)
);

CREATE TABLE IF NOT EXISTS cart.shipping_methods (
 id uuid PRIMARY KEY,
 code text UNIQUE NOT NULL CHECK(code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
 name_fa text NOT NULL CHECK(length(btrim(name_fa))>=2),
 fee_toman bigint NOT NULL CHECK(fee_toman>=0),
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax.tax_rules (
 id uuid PRIMARY KEY,
 name_fa text NOT NULL CHECK(length(btrim(name_fa))>=2),
 rate_basis_points integer NOT NULL CHECK(rate_basis_points BETWEEN 0 AND 10000),
 scope_type text NOT NULL CHECK(scope_type IN ('global','brand','category','product')),
 scope_id uuid NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','expired')),
 starts_at timestamptz NULL,
 ends_at timestamptz NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((scope_type='global' AND scope_id IS NULL) OR (scope_type<>'global' AND scope_id IS NOT NULL)),
 CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);
CREATE INDEX IF NOT EXISTS ix_tax_rules_active ON tax.tax_rules(status,scope_type,scope_id);
ALTER TABLE tax.tax_rules DROP CONSTRAINT IF EXISTS ex_tax_rule_active_overlap;
ALTER TABLE tax.tax_rules ADD CONSTRAINT ex_tax_rule_active_overlap EXCLUDE USING gist (
 scope_type WITH =,
 (COALESCE(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
 (tstzrange(COALESCE(starts_at,'-infinity'::timestamptz),COALESCE(ends_at,'infinity'::timestamptz),'[)')) WITH &&
) WHERE(status='active');

CREATE OR REPLACE FUNCTION tax.validate_rule_scope_target() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.scope_type='brand' AND NOT EXISTS(SELECT 1 FROM catalog.brands WHERE id=NEW.scope_id) THEN RAISE EXCEPTION 'TAX_SCOPE_BRAND_NOT_FOUND'; END IF;
 IF NEW.scope_type='category' AND NOT EXISTS(SELECT 1 FROM catalog.categories WHERE id=NEW.scope_id) THEN RAISE EXCEPTION 'TAX_SCOPE_CATEGORY_NOT_FOUND'; END IF;
 IF NEW.scope_type='product' AND NOT EXISTS(SELECT 1 FROM catalog.products WHERE id=NEW.scope_id) THEN RAISE EXCEPTION 'TAX_SCOPE_PRODUCT_NOT_FOUND'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tax_validate_scope ON tax.tax_rules;
CREATE TRIGGER trg_tax_validate_scope BEFORE INSERT OR UPDATE OF scope_type,scope_id ON tax.tax_rules FOR EACH ROW EXECUTE FUNCTION tax.validate_rule_scope_target();

CREATE TABLE IF NOT EXISTS cart.checkouts (
 id uuid PRIMARY KEY,
 cart_id uuid NOT NULL REFERENCES cart.carts(id) ON DELETE RESTRICT,
 cart_version_snapshot integer NOT NULL CHECK(cart_version_snapshot>0),
 customer_id uuid NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
 token_hash char(64) NOT NULL,
 status text NOT NULL CHECK(status IN ('quoted','reserved','order_created','expired','cancelled')),
 shipping_method_id uuid NOT NULL REFERENCES cart.shipping_methods(id) ON DELETE RESTRICT,
 subtotal_toman bigint NOT NULL CHECK(subtotal_toman>=0),
 discount_toman bigint NOT NULL CHECK(discount_toman>=0),
 shipping_toman bigint NOT NULL CHECK(shipping_toman>=0),
 tax_toman bigint NOT NULL CHECK(tax_toman>=0),
 total_toman bigint NOT NULL CHECK(total_toman>=0),
 reservation_id uuid NULL REFERENCES inventory.reservations(id) ON DELETE RESTRICT,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(total_toman=subtotal_toman-discount_toman+shipping_toman+tax_toman),
 CHECK((status='quoted' AND reservation_id IS NULL) OR status IN ('expired','cancelled') OR (status IN ('reserved','order_created') AND reservation_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_advanced_checkout ON cart.checkouts(cart_id) WHERE status IN ('reserved','order_created');
CREATE INDEX IF NOT EXISTS ix_checkouts_expiry ON cart.checkouts(status,expires_at) WHERE status IN ('quoted','reserved');

CREATE TABLE IF NOT EXISTS cart.checkout_items (
 id uuid PRIMARY KEY,
 checkout_id uuid NOT NULL REFERENCES cart.checkouts(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
 variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
 sku text NOT NULL,
 product_name text NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0),
 unit_base_toman bigint NOT NULL CHECK(unit_base_toman>=0),
 unit_final_toman bigint NOT NULL CHECK(unit_final_toman>=0),
 discount_toman bigint NOT NULL CHECK(discount_toman>=0),
 tax_toman bigint NOT NULL CHECK(tax_toman>=0),
 tax_rule_id uuid NOT NULL REFERENCES tax.tax_rules(id) ON DELETE RESTRICT,
 line_total_toman bigint NOT NULL CHECK(line_total_toman>=0),
 pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(pricing_snapshot)='object'),
 CHECK(discount_toman=(unit_base_toman-unit_final_toman)*quantity),
 CHECK(line_total_toman=unit_final_toman*quantity+tax_toman),
 UNIQUE(checkout_id,variant_id)
);

CREATE TABLE IF NOT EXISTS orders.orders (
 id uuid PRIMARY KEY,
 order_number text UNIQUE NOT NULL,
 checkout_id uuid UNIQUE NOT NULL REFERENCES cart.checkouts(id) ON DELETE RESTRICT,
 customer_id uuid NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
 reservation_id uuid UNIQUE NOT NULL REFERENCES inventory.reservations(id) ON DELETE RESTRICT,
 status text NOT NULL CHECK(status IN ('draft','pending_confirmation','confirmed','cancelled','expired','completed')),
 subtotal_toman bigint NOT NULL CHECK(subtotal_toman>=0),
 discount_toman bigint NOT NULL CHECK(discount_toman>=0),
 shipping_toman bigint NOT NULL CHECK(shipping_toman>=0),
 tax_toman bigint NOT NULL CHECK(tax_toman>=0),
 total_toman bigint NOT NULL CHECK(total_toman>=0),
 address_snapshot jsonb NOT NULL CHECK(jsonb_typeof(address_snapshot)='object'),
 confirmation_expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 CHECK(total_toman=subtotal_toman-discount_toman+shipping_toman+tax_toman),
 CHECK(confirmation_expires_at>created_at),
 CHECK(address_snapshot ?& ARRAY['recipient_name','recipient_mobile','province_id','city_id','postal_code','address_line']),
 CHECK(length(btrim(address_snapshot->>'recipient_name')) BETWEEN 1 AND 150),
 CHECK((address_snapshot->>'recipient_mobile') ~ '^09[0-9]{9}$'),
 CHECK((address_snapshot->>'postal_code') ~ '^[0-9]{10}$'),
 CHECK(length(btrim(address_snapshot->>'address_line')) BETWEEN 1 AND 1000)
);
CREATE INDEX IF NOT EXISTS ix_orders_customer_created ON orders.orders(customer_id,created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_orders_pending_created ON orders.orders(created_at) WHERE status='pending_confirmation';

CREATE TABLE IF NOT EXISTS orders.order_items (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
 variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
 sku text NOT NULL, product_name text NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0),
 unit_base_toman bigint NOT NULL CHECK(unit_base_toman>=0), unit_final_toman bigint NOT NULL CHECK(unit_final_toman>=0),
 discount_toman bigint NOT NULL CHECK(discount_toman>=0), tax_toman bigint NOT NULL CHECK(tax_toman>=0),
 tax_rule_id uuid NOT NULL REFERENCES tax.tax_rules(id) ON DELETE RESTRICT,
 line_total_toman bigint NOT NULL CHECK(line_total_toman>=0),
 pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(pricing_snapshot)='object'),
 CHECK(discount_toman=(unit_base_toman-unit_final_toman)*quantity),
 CHECK(line_total_toman=unit_final_toman*quantity+tax_toman),
 UNIQUE(order_id,variant_id)
);
CREATE TABLE IF NOT EXISTS orders.order_status_history (
 id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
 from_status text NULL, to_status text NOT NULL, reason text NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_order_history_order_time ON orders.order_status_history(order_id,created_at,id);

CREATE OR REPLACE FUNCTION cart.assert_checkout_totals(p_checkout uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE h cart.checkouts%ROWTYPE; s record;
BEGIN
 SELECT * INTO h FROM cart.checkouts WHERE id=p_checkout; IF NOT FOUND THEN RETURN; END IF;
 SELECT COALESCE(sum(unit_base_toman*quantity),0) subtotal,COALESCE(sum(discount_toman),0) discount,COALESCE(sum(tax_toman),0) tax,COUNT(*) cnt INTO s FROM cart.checkout_items WHERE checkout_id=p_checkout;
 IF s.cnt=0 OR h.subtotal_toman<>s.subtotal OR h.discount_toman<>s.discount OR h.tax_toman<>s.tax OR h.total_toman<>s.subtotal-s.discount+s.tax+h.shipping_toman THEN RAISE EXCEPTION 'CHECKOUT_TOTAL_MISMATCH'; END IF;
END $$;
CREATE OR REPLACE FUNCTION cart.trg_assert_checkout_totals() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM cart.assert_checkout_totals(COALESCE(NEW.checkout_id,OLD.checkout_id)); RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION cart.trg_assert_checkout_header() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM cart.assert_checkout_totals(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_checkout_items_totals ON cart.checkout_items;
CREATE CONSTRAINT TRIGGER trg_checkout_items_totals AFTER INSERT OR UPDATE OR DELETE ON cart.checkout_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cart.trg_assert_checkout_totals();
DROP TRIGGER IF EXISTS trg_checkout_header_totals ON cart.checkouts;
CREATE CONSTRAINT TRIGGER trg_checkout_header_totals AFTER INSERT OR UPDATE OF subtotal_toman,discount_toman,tax_toman,shipping_toman,total_toman ON cart.checkouts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cart.trg_assert_checkout_header();

CREATE OR REPLACE FUNCTION orders.assert_order_totals(p_order uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE h orders.orders%ROWTYPE; s record;
BEGIN
 SELECT * INTO h FROM orders.orders WHERE id=p_order; IF NOT FOUND THEN RETURN; END IF;
 SELECT COALESCE(sum(unit_base_toman*quantity),0) subtotal,COALESCE(sum(discount_toman),0) discount,COALESCE(sum(tax_toman),0) tax,COUNT(*) cnt INTO s FROM orders.order_items WHERE order_id=p_order;
 IF s.cnt=0 OR h.subtotal_toman<>s.subtotal OR h.discount_toman<>s.discount OR h.tax_toman<>s.tax OR h.total_toman<>s.subtotal-s.discount+s.tax+h.shipping_toman THEN RAISE EXCEPTION 'ORDER_TOTAL_MISMATCH'; END IF;
END $$;
CREATE OR REPLACE FUNCTION orders.trg_assert_order_totals() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM orders.assert_order_totals(COALESCE(NEW.order_id,OLD.order_id)); RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION orders.trg_assert_order_header() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM orders.assert_order_totals(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_order_items_totals ON orders.order_items;
CREATE CONSTRAINT TRIGGER trg_order_items_totals AFTER INSERT OR UPDATE OR DELETE ON orders.order_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orders.trg_assert_order_totals();
DROP TRIGGER IF EXISTS trg_order_header_totals ON orders.orders;
CREATE CONSTRAINT TRIGGER trg_order_header_totals AFTER INSERT OR UPDATE OF subtotal_toman,discount_toman,tax_toman,shipping_toman,total_toman ON orders.orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orders.trg_assert_order_header();
