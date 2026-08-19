BEGIN;

CREATE SCHEMA IF NOT EXISTS after_sales;

CREATE TABLE IF NOT EXISTS after_sales.replacements (
  id uuid PRIMARY KEY,
  source_type varchar(20) NOT NULL CHECK(source_type IN ('return_item','warranty_claim')),
  source_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK(quantity>0),
  status varchar(30) NOT NULL DEFAULT 'requested'
    CHECK(status IN ('requested','allocated','shipped','completed','cancelled')),
  note text NULL CHECK(note IS NULL OR length(note)<=4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(source_type,source_id)
);
CREATE INDEX IF NOT EXISTS ix_after_sales_replacements_status
  ON after_sales.replacements(status,created_at,id);

ALTER TABLE returns.return_items
  ADD COLUMN IF NOT EXISTS replacement_request_id uuid NULL REFERENCES after_sales.replacements(id) ON DELETE RESTRICT;

ALTER TABLE warranty.claims
  ADD COLUMN IF NOT EXISTS replacement_request_id uuid NULL REFERENCES after_sales.replacements(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION after_sales.assert_replacement_source(p_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r after_sales.replacements%ROWTYPE; ok boolean;
BEGIN
  SELECT * INTO r FROM after_sales.replacements WHERE id=p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF r.source_type='return_item' THEN
    SELECT EXISTS(
      SELECT 1 FROM returns.return_items ri
      JOIN returns.returns rh ON rh.id=ri.return_id
      JOIN orders.order_items oi ON oi.id=ri.order_item_id
      WHERE ri.id=r.source_id AND rh.order_id=r.order_id AND rh.customer_id=r.customer_id
        AND ri.order_item_id=r.order_item_id AND oi.variant_id=r.variant_id
    ) INTO ok;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM warranty.claims c JOIN orders.order_items oi ON oi.id=c.order_item_id
      WHERE c.id=r.source_id AND c.order_id=r.order_id AND c.customer_id=r.customer_id
        AND c.order_item_id=r.order_item_id AND oi.variant_id=r.variant_id
    ) INTO ok;
  END IF;
  IF NOT ok THEN RAISE EXCEPTION 'AFTER_SALES_REPLACEMENT_LINEAGE_MISMATCH'; END IF;
END $$;

CREATE OR REPLACE FUNCTION after_sales.trg_replacement_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM after_sales.assert_replacement_source(NEW.id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_after_sales_replacement_source ON after_sales.replacements;
CREATE CONSTRAINT TRIGGER trg_after_sales_replacement_source
AFTER INSERT OR UPDATE ON after_sales.replacements DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION after_sales.trg_replacement_source();

-- A resolved return item must have exactly the linkage required by its chosen resolution.
CREATE OR REPLACE FUNCTION returns.assert_resolution_linkage(p_item uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE ri returns.return_items%ROWTYPE;
BEGIN
  SELECT * INTO ri FROM returns.return_items WHERE id=p_item;
  IF NOT FOUND OR ri.status<>'resolved' THEN RETURN; END IF;

  IF ri.resolution='refund' AND ri.refund_id IS NULL THEN RAISE EXCEPTION 'RETURN_REFUND_LINK_REQUIRED'; END IF;
  IF ri.resolution='replacement' AND ri.replacement_request_id IS NULL THEN RAISE EXCEPTION 'RETURN_REPLACEMENT_LINK_REQUIRED'; END IF;
  IF ri.disposition IN ('restock_sellable','restock_quarantine','damaged') AND ri.inventory_movement_id IS NULL
    THEN RAISE EXCEPTION 'RETURN_INVENTORY_LINK_REQUIRED'; END IF;
  IF ri.resolution IS NULL THEN RAISE EXCEPTION 'RETURN_RESOLUTION_REQUIRED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION returns.trg_resolution_linkage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM returns.assert_resolution_linkage(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_return_resolution_linkage ON returns.return_items;
CREATE CONSTRAINT TRIGGER trg_return_resolution_linkage
AFTER INSERT OR UPDATE OR DELETE ON returns.return_items DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION returns.trg_resolution_linkage();

CREATE OR REPLACE FUNCTION warranty.assert_resolution_linkage(p_claim uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c warranty.claims%ROWTYPE;
BEGIN
  SELECT * INTO c FROM warranty.claims WHERE id=p_claim;
  IF NOT FOUND OR c.status NOT IN ('resolved','closed') THEN RETURN; END IF;
  IF c.resolution IS NULL THEN RAISE EXCEPTION 'WARRANTY_RESOLUTION_REQUIRED'; END IF;
  IF c.resolution='refund' AND c.refund_id IS NULL THEN RAISE EXCEPTION 'WARRANTY_REFUND_LINK_REQUIRED'; END IF;
  IF c.resolution='replacement' AND c.replacement_request_id IS NULL THEN RAISE EXCEPTION 'WARRANTY_REPLACEMENT_LINK_REQUIRED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION warranty.trg_resolution_linkage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM warranty.assert_resolution_linkage(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_warranty_resolution_linkage ON warranty.claims;
CREATE CONSTRAINT TRIGGER trg_warranty_resolution_linkage
AFTER INSERT OR UPDATE OR DELETE ON warranty.claims DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION warranty.trg_resolution_linkage();

COMMIT;
