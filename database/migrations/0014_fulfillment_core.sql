BEGIN;

CREATE SCHEMA IF NOT EXISTS fulfillment;

CREATE TABLE IF NOT EXISTS fulfillment.carrier_providers (
  id uuid PRIMARY KEY,
  provider_key varchar(80) NOT NULL UNIQUE,
  name_fa varchar(160) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  supports_tracking_webhook boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK (provider_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  CHECK (length(btrim(name_fa)) BETWEEN 2 AND 160)
);

CREATE TABLE IF NOT EXISTS fulfillment.fulfillments (
  order_id uuid PRIMARY KEY REFERENCES orders.orders(id) ON DELETE RESTRICT,
  status varchar(30) NOT NULL DEFAULT 'unfulfilled'
    CHECK(status IN ('unfulfilled','partially_allocated','allocated','preparing','partially_shipped','shipped','partially_delivered','delivered','cancelled')),
  allocation_strategy varchar(40) NULL
    CHECK(allocation_strategy IS NULL OR allocation_strategy IN ('single_warehouse_preferred','manual')),
  preparation_note text NULL,
  preparation_started_at timestamptz NULL,
  completed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK (preparation_note IS NULL OR length(btrim(preparation_note)) BETWEEN 1 AND 2000),
  CHECK (status <> 'preparing' OR preparation_started_at IS NOT NULL),
  CHECK (status <> 'delivered' OR completed_at IS NOT NULL),
  CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CHECK (completed_at IS NULL OR completed_at >= created_at),
  CHECK (cancelled_at IS NULL OR cancelled_at >= created_at)
);
CREATE INDEX IF NOT EXISTS ix_fulfillments_status_updated ON fulfillment.fulfillments(status,updated_at,order_id);

-- Inventory remains the owner of allocation quantity/status. Fulfillment stores only physical pick/ship progress.
CREATE TABLE IF NOT EXISTS fulfillment.allocation_progress (
  allocation_id uuid PRIMARY KEY REFERENCES inventory.allocations(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  picked_quantity integer NOT NULL DEFAULT 0 CHECK(picked_quantity >= 0),
  shipped_quantity integer NOT NULL DEFAULT 0 CHECK(shipped_quantity >= 0 AND shipped_quantity <= picked_quantity),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  UNIQUE(order_id,allocation_id)
);
CREATE INDEX IF NOT EXISTS ix_fulfillment_alloc_order ON fulfillment.allocation_progress(order_id,order_item_id,allocation_id);

CREATE TABLE IF NOT EXISTS fulfillment.shipments (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  carrier_provider_id uuid NULL REFERENCES fulfillment.carrier_providers(id) ON DELETE RESTRICT,
  provider_key varchar(80) NULL,
  shipping_method varchar(80) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','ready','handed_over','in_transit','delivered','delivery_failed','cancelled','returned')),
  tracking_number varchar(200) NULL,
  ready_at timestamptz NULL,
  handed_over_at timestamptz NULL,
  delivered_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  cancel_reason text NULL,
  last_tracking_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK(length(btrim(shipping_method)) BETWEEN 1 AND 80),
  CHECK(provider_key IS NULL OR provider_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  CHECK(tracking_number IS NULL OR length(btrim(tracking_number)) BETWEEN 1 AND 200),
  CHECK(cancel_reason IS NULL OR length(btrim(cancel_reason)) BETWEEN 1 AND 2000),
  CHECK(status <> 'ready' OR ready_at IS NOT NULL),
  CHECK(status NOT IN ('handed_over','in_transit','delivered','delivery_failed','returned') OR handed_over_at IS NOT NULL),
  CHECK(status <> 'delivered' OR delivered_at IS NOT NULL),
  CHECK(status <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
  CHECK(ready_at IS NULL OR ready_at >= created_at),
  CHECK(handed_over_at IS NULL OR handed_over_at >= created_at),
  CHECK(delivered_at IS NULL OR delivered_at >= created_at),
  CHECK(delivered_at IS NULL OR handed_over_at IS NULL OR delivered_at >= handed_over_at),
  CHECK(cancelled_at IS NULL OR cancelled_at >= created_at)
);
CREATE INDEX IF NOT EXISTS ix_shipments_order_created ON fulfillment.shipments(order_id,created_at,id);
CREATE INDEX IF NOT EXISTS ix_shipments_status_updated ON fulfillment.shipments(status,updated_at,id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_shipments_provider_tracking ON fulfillment.shipments(provider_key,tracking_number)
  WHERE provider_key IS NOT NULL AND tracking_number IS NOT NULL AND status <> 'cancelled';

CREATE TABLE IF NOT EXISTS fulfillment.shipment_items (
  id uuid PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES fulfillment.shipments(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES fulfillment.allocation_progress(allocation_id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK(quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shipment_id,allocation_id)
);
CREATE INDEX IF NOT EXISTS ix_shipment_items_allocation ON fulfillment.shipment_items(allocation_id,shipment_id);

CREATE TABLE IF NOT EXISTS fulfillment.shipping_webhook_inbox (
  id uuid PRIMARY KEY,
  provider_key varchar(80) NOT NULL,
  external_event_id varchar(240) NOT NULL,
  tracking_number varchar(200) NOT NULL,
  payload_hash text NOT NULL,
  status varchar(20) NOT NULL CHECK(status IN ('received','processed','failed')),
  shipment_id uuid NULL REFERENCES fulfillment.shipments(id) ON DELETE SET NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
  last_error_code varchar(120) NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_key,external_event_id),
  CHECK(length(btrim(external_event_id)) BETWEEN 1 AND 240),
  CHECK(length(btrim(tracking_number)) BETWEEN 1 AND 200),
  CHECK(length(payload_hash) >= 32)
);
CREATE INDEX IF NOT EXISTS ix_shipping_webhook_retry ON fulfillment.shipping_webhook_inbox(status,updated_at,id) WHERE status <> 'processed';

CREATE TABLE IF NOT EXISTS fulfillment.tracking_events (
  id uuid PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES fulfillment.shipments(id) ON DELETE RESTRICT,
  provider_key varchar(80) NOT NULL,
  external_event_id varchar(240) NULL,
  tracking_number varchar(200) NOT NULL,
  provider_status varchar(100) NOT NULL,
  normalized_status varchar(30) NOT NULL
    CHECK(normalized_status IN ('ready','handed_over','in_transit','delivered','delivery_failed','returned','unknown')),
  occurred_at timestamptz NOT NULL,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(length(btrim(provider_status)) BETWEEN 1 AND 100),
  CHECK(length(payload_hash) >= 32)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tracking_provider_event ON fulfillment.tracking_events(provider_key,external_event_id)
  WHERE external_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tracking_event_fingerprint ON fulfillment.tracking_events(shipment_id,provider_key,tracking_number,occurred_at,payload_hash);
CREATE INDEX IF NOT EXISTS ix_tracking_shipment_time ON fulfillment.tracking_events(shipment_id,occurred_at,id);

-- Eligibility: Fulfillment may progress only for a confirmed order with an accepted settlement projection.
CREATE OR REPLACE FUNCTION fulfillment.assert_order_eligible(p_order uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE s text; ps text; settlement uuid;
BEGIN
  SELECT status,payment_status,settlement_payment_id INTO s,ps,settlement FROM orders.orders WHERE id=p_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'FULFILLMENT_ORDER_NOT_FOUND'; END IF;
  IF s NOT IN ('confirmed','completed') THEN RAISE EXCEPTION 'FULFILLMENT_ORDER_NOT_CONFIRMED'; END IF;
  IF ps NOT IN ('paid','partially_refunded') OR settlement IS NULL THEN RAISE EXCEPTION 'FULFILLMENT_PAYMENT_NOT_SETTLED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION fulfillment.assert_fulfillment_row(p_order uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM fulfillment.fulfillments WHERE order_id=p_order;
  IF st IS NULL THEN RETURN; END IF;
  IF st <> 'unfulfilled' THEN PERFORM fulfillment.assert_order_eligible(p_order); END IF;
END $$;
CREATE OR REPLACE FUNCTION fulfillment.trg_fulfillment_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM fulfillment.assert_fulfillment_row(NEW.order_id); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_fulfillment_order_eligibility ON fulfillment.fulfillments;
CREATE CONSTRAINT TRIGGER trg_fulfillment_order_eligibility
AFTER INSERT OR UPDATE ON fulfillment.fulfillments DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fulfillment.trg_fulfillment_row();

-- Protect OrderItem ↔ Inventory allocation lineage and aggregate quantity.
CREATE OR REPLACE FUNCTION fulfillment.assert_inventory_allocation(p_allocation uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE a inventory.allocations%ROWTYPE; oi orders.order_items%ROWTYPE; total integer;
BEGIN
  SELECT * INTO a FROM inventory.allocations WHERE id=p_allocation;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO oi FROM orders.order_items WHERE id=a.order_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FULFILLMENT_ORDER_ITEM_NOT_FOUND'; END IF;
  IF oi.variant_id <> a.variant_id THEN RAISE EXCEPTION 'FULFILLMENT_ALLOCATION_VARIANT_MISMATCH'; END IF;
  SELECT COALESCE(sum(quantity),0)::int INTO total FROM inventory.allocations
    WHERE order_item_id=a.order_item_id AND status <> 'released';
  IF total > oi.quantity THEN RAISE EXCEPTION 'FULFILLMENT_ALLOCATION_EXCEEDS_ORDER_ITEM'; END IF;
END $$;
CREATE OR REPLACE FUNCTION fulfillment.trg_inventory_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM fulfillment.assert_inventory_allocation(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_fulfillment_inventory_allocation ON inventory.allocations;
CREATE CONSTRAINT TRIGGER trg_fulfillment_inventory_allocation
AFTER INSERT OR UPDATE OR DELETE ON inventory.allocations DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fulfillment.trg_inventory_allocation();

CREATE OR REPLACE FUNCTION fulfillment.assert_allocation_progress(p_allocation uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE fp fulfillment.allocation_progress%ROWTYPE; a inventory.allocations%ROWTYPE; oi orders.order_items%ROWTYPE;
BEGIN
  SELECT * INTO fp FROM fulfillment.allocation_progress WHERE allocation_id=p_allocation;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO a FROM inventory.allocations WHERE id=p_allocation;
  IF NOT FOUND THEN RAISE EXCEPTION 'FULFILLMENT_ALLOCATION_NOT_FOUND'; END IF;
  PERFORM fulfillment.assert_order_eligible(fp.order_id);
  SELECT * INTO oi FROM orders.order_items WHERE id=fp.order_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FULFILLMENT_ORDER_ITEM_NOT_FOUND'; END IF;
  IF a.order_item_id<>fp.order_item_id OR oi.order_id<>fp.order_id THEN RAISE EXCEPTION 'FULFILLMENT_ALLOCATION_ORDER_MISMATCH'; END IF;
  IF fp.picked_quantity>a.quantity OR fp.shipped_quantity>a.quantity THEN RAISE EXCEPTION 'FULFILLMENT_PROGRESS_EXCEEDS_ALLOCATION'; END IF;
  IF a.status='allocated' AND fp.shipped_quantity>0 THEN RAISE EXCEPTION 'FULFILLMENT_SHIPPED_REQUIRES_PICK'; END IF;
  IF a.status='released' AND (fp.picked_quantity>0 OR fp.shipped_quantity>0) THEN RAISE EXCEPTION 'FULFILLMENT_RELEASED_ALLOCATION_HAS_PROGRESS'; END IF;
END $$;
CREATE OR REPLACE FUNCTION fulfillment.trg_allocation_progress() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM fulfillment.assert_allocation_progress(COALESCE(NEW.allocation_id,OLD.allocation_id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_fulfillment_allocation_progress ON fulfillment.allocation_progress;
CREATE CONSTRAINT TRIGGER trg_fulfillment_allocation_progress
AFTER INSERT OR UPDATE OR DELETE ON fulfillment.allocation_progress DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fulfillment.trg_allocation_progress();

-- Shipment items must be from the same order/warehouse and may never exceed picked quantity.
CREATE OR REPLACE FUNCTION fulfillment.assert_shipment(p_shipment uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE sh fulfillment.shipments%ROWTYPE; bad integer; item_count integer; aid uuid; picked integer; shipped integer; invstatus text;
BEGIN
  SELECT * INTO sh FROM fulfillment.shipments WHERE id=p_shipment;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM fulfillment.assert_order_eligible(sh.order_id);
  IF sh.carrier_provider_id IS NOT NULL THEN
    IF sh.provider_key IS NULL OR NOT EXISTS(SELECT 1 FROM fulfillment.carrier_providers cp WHERE cp.id=sh.carrier_provider_id AND cp.is_active=true AND cp.provider_key=sh.provider_key)
      THEN RAISE EXCEPTION 'FULFILLMENT_CARRIER_PROVIDER_INVALID'; END IF;
  ELSIF sh.provider_key IS NOT NULL THEN
    RAISE EXCEPTION 'FULFILLMENT_PROVIDER_SNAPSHOT_WITHOUT_CARRIER';
  END IF;
  SELECT count(*) INTO item_count FROM fulfillment.shipment_items WHERE shipment_id=sh.id;
  IF item_count=0 THEN RAISE EXCEPTION 'FULFILLMENT_SHIPMENT_ITEMS_REQUIRED'; END IF;
  SELECT COUNT(*) INTO bad
  FROM fulfillment.shipment_items si
  JOIN fulfillment.allocation_progress fp ON fp.allocation_id=si.allocation_id
  JOIN inventory.allocations a ON a.id=si.allocation_id
  JOIN orders.order_items oi ON oi.id=si.order_item_id
  WHERE si.shipment_id=sh.id
    AND (fp.order_id<>sh.order_id OR fp.order_item_id<>si.order_item_id OR oi.order_id<>sh.order_id OR a.warehouse_id<>sh.warehouse_id OR a.order_item_id<>si.order_item_id);
  IF bad>0 THEN RAISE EXCEPTION 'FULFILLMENT_SHIPMENT_LINEAGE_MISMATCH'; END IF;

  FOR aid,picked,invstatus IN
    SELECT fp.allocation_id,fp.picked_quantity,a.status
    FROM fulfillment.allocation_progress fp JOIN inventory.allocations a ON a.id=fp.allocation_id
    WHERE EXISTS(SELECT 1 FROM fulfillment.shipment_items si WHERE si.shipment_id=sh.id AND si.allocation_id=fp.allocation_id)
  LOOP
    SELECT COALESCE(sum(si.quantity),0)::int INTO shipped
    FROM fulfillment.shipment_items si JOIN fulfillment.shipments s ON s.id=si.shipment_id
    WHERE si.allocation_id=aid AND s.status<>'cancelled';
    IF shipped>picked THEN RAISE EXCEPTION 'FULFILLMENT_SHIPMENT_EXCEEDS_PICKED'; END IF;
    IF sh.status IN ('handed_over','in_transit','delivered','delivery_failed','returned') AND invstatus<>'shipped' THEN
      RAISE EXCEPTION 'FULFILLMENT_HANDOVER_REQUIRES_SHIPPED_INVENTORY';
    END IF;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION fulfillment.trg_shipment_header() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM fulfillment.assert_shipment(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION fulfillment.trg_shipment_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM fulfillment.assert_shipment(COALESCE(NEW.shipment_id,OLD.shipment_id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_fulfillment_shipment_header ON fulfillment.shipments;
CREATE CONSTRAINT TRIGGER trg_fulfillment_shipment_header
AFTER INSERT OR UPDATE OR DELETE ON fulfillment.shipments DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fulfillment.trg_shipment_header();
DROP TRIGGER IF EXISTS trg_fulfillment_shipment_item ON fulfillment.shipment_items;
CREATE CONSTRAINT TRIGGER trg_fulfillment_shipment_item
AFTER INSERT OR UPDATE OR DELETE ON fulfillment.shipment_items DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fulfillment.trg_shipment_item();

-- Shipment lifecycle is monotonic after physical handover. Cancellation is allowed only before handover.
CREATE OR REPLACE FUNCTION fulfillment.guard_shipment_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN RETURN NEW; END IF;
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF OLD.status='draft' AND NEW.status IN ('ready','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='ready' AND NEW.status IN ('handed_over','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='handed_over' AND NEW.status IN ('in_transit','delivered','delivery_failed') THEN RETURN NEW; END IF;
  IF OLD.status='in_transit' AND NEW.status IN ('delivered','delivery_failed','returned') THEN RETURN NEW; END IF;
  IF OLD.status='delivery_failed' AND NEW.status IN ('in_transit','returned') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'FULFILLMENT_INVALID_SHIPMENT_TRANSITION';
END $$;
DROP TRIGGER IF EXISTS trg_fulfillment_shipment_transition ON fulfillment.shipments;
CREATE TRIGGER trg_fulfillment_shipment_transition BEFORE UPDATE OF status ON fulfillment.shipments
FOR EACH ROW EXECUTE FUNCTION fulfillment.guard_shipment_transition();

-- Tracking history is append-only for audit/forensics.
CREATE OR REPLACE FUNCTION fulfillment.prevent_tracking_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'fulfillment.tracking_events is append-only'; END $$;
DROP TRIGGER IF EXISTS trg_tracking_prevent_mutation ON fulfillment.tracking_events;
CREATE TRIGGER trg_tracking_prevent_mutation BEFORE UPDATE OR DELETE ON fulfillment.tracking_events
FOR EACH ROW EXECUTE FUNCTION fulfillment.prevent_tracking_mutation();

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('fulfillment.view','fulfillment','مشاهده آماده‌سازی و ارسال سفارش','normal'),
 ('fulfillment.allocate','fulfillment','تخصیص سفارش برای آماده‌سازی','high'),
 ('fulfillment.pick','fulfillment','ثبت Pick و Unpick سفارش','high'),
 ('fulfillment.shipment.manage','fulfillment','مدیریت مرسوله و تحویل به حامل','high'),
 ('fulfillment.tracking.manage','fulfillment','مدیریت تطبیق وضعیت حمل','high'),
 ('fulfillment.carrier.manage','fulfillment','مدیریت ارائه‌دهندگان حمل','critical')
ON CONFLICT (key) DO NOTHING;

COMMIT;
