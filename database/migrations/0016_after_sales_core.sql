BEGIN;

CREATE SCHEMA IF NOT EXISTS returns;
CREATE SCHEMA IF NOT EXISTS warranty;

-- Business-policy values are deliberately data/config driven. Step 40 does not hard-code
-- return-window or warranty-duration assumptions that have not been approved by the owner.
CREATE TABLE IF NOT EXISTS returns.policies (
  id uuid PRIMARY KEY,
  policy_key varchar(80) NOT NULL UNIQUE CHECK(policy_key ~ '^[a-z0-9][a-z0-9_.-]{1,79}$'),
  enabled boolean NOT NULL DEFAULT true,
  return_window_days integer NULL CHECK(return_window_days IS NULL OR return_window_days BETWEEN 0 AND 3650),
  customer_pays_return_shipping boolean NULL,
  opened_item_allowed boolean NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(config)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0)
);

CREATE TABLE IF NOT EXISTS returns.returns (
  id uuid PRIMARY KEY,
  return_number varchar(50) NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
  status varchar(30) NOT NULL DEFAULT 'requested'
    CHECK(status IN ('requested','under_review','approved','rejected','in_transit_to_store','received','inspecting','resolved','cancelled')),
  policy_id uuid NULL REFERENCES returns.policies(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  received_at timestamptz NULL,
  inspection_started_at timestamptz NULL,
  resolved_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  rejection_reason text NULL CHECK(rejection_reason IS NULL OR length(btrim(rejection_reason)) BETWEEN 2 AND 2000),
  cancel_reason text NULL CHECK(cancel_reason IS NULL OR length(btrim(cancel_reason)) BETWEEN 2 AND 2000),
  review_comment text NULL CHECK(review_comment IS NULL OR length(review_comment) <= 2000),
  resolution_note text NULL CHECK(resolution_note IS NULL OR length(btrim(resolution_note)) BETWEEN 2 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK(status<>'under_review' OR reviewed_at IS NOT NULL),
  CHECK(status<>'approved' OR approved_at IS NOT NULL),
  CHECK(status<>'rejected' OR (rejected_at IS NOT NULL AND rejection_reason IS NOT NULL)),
  CHECK(status<>'received' OR received_at IS NOT NULL),
  CHECK(status<>'inspecting' OR inspection_started_at IS NOT NULL),
  CHECK(status<>'resolved' OR (resolved_at IS NOT NULL AND resolution_note IS NOT NULL)),
  CHECK(status<>'cancelled' OR (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_returns_customer_requested ON returns.returns(customer_id,requested_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_returns_order ON returns.returns(order_id,requested_at,id);
CREATE INDEX IF NOT EXISTS ix_returns_status_updated ON returns.returns(status,updated_at,id);

CREATE TABLE IF NOT EXISTS returns.return_items (
  id uuid PRIMARY KEY,
  return_id uuid NOT NULL REFERENCES returns.returns(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK(quantity>0),
  reason_code varchar(100) NOT NULL CHECK(length(btrim(reason_code)) BETWEEN 1 AND 100),
  note text NULL CHECK(note IS NULL OR length(note)<=1000),
  status varchar(30) NOT NULL DEFAULT 'requested'
    CHECK(status IN ('requested','approved','rejected','received','inspecting','resolved','cancelled')),
  received_quantity integer NOT NULL DEFAULT 0 CHECK(received_quantity>=0 AND received_quantity<=quantity),
  disposition varchar(30) NULL CHECK(disposition IS NULL OR disposition IN ('restock_sellable','restock_quarantine','damaged','repair','replace','refund','no_action')),
  resolution varchar(40) NULL CHECK(resolution IS NULL OR resolution IN ('refund','replacement','repair','store_credit','rejected','no_action')),
  refund_id uuid NULL REFERENCES payments.refunds(id) ON DELETE RESTRICT,
  replacement_order_item_id uuid NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  inventory_movement_id uuid NULL REFERENCES inventory.movements(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(return_id,order_item_id),
  CHECK(status NOT IN ('received','inspecting','resolved') OR received_quantity>0),
  CHECK(status<>'resolved' OR disposition IS NOT NULL),
  CHECK(resolution<>'refund' OR refund_id IS NOT NULL),
  CHECK(disposition NOT IN ('restock_sellable','restock_quarantine','damaged') OR inventory_movement_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_return_items_order_item ON returns.return_items(order_item_id,return_id);

-- Link the pre-existing inventory audit trail to the concrete Return item entity.
ALTER TABLE inventory.movements
  DROP CONSTRAINT IF EXISTS fk_inventory_movement_return_item;
ALTER TABLE inventory.movements
  ADD CONSTRAINT fk_inventory_movement_return_item
  FOREIGN KEY(return_item_id) REFERENCES returns.return_items(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE inventory.movements VALIDATE CONSTRAINT fk_inventory_movement_return_item;

CREATE TABLE IF NOT EXISTS returns.status_history (
  id uuid PRIMARY KEY,
  return_id uuid NOT NULL REFERENCES returns.returns(id) ON DELETE CASCADE,
  from_status varchar(30) NULL,
  to_status varchar(30) NOT NULL,
  reason text NULL,
  actor_type varchar(20) NULL CHECK(actor_type IS NULL OR actor_type IN ('customer','staff','system')),
  actor_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_return_history_return_time ON returns.status_history(return_id,created_at,id);

CREATE TABLE IF NOT EXISTS warranty.policies (
  id uuid PRIMARY KEY,
  policy_key varchar(80) NOT NULL UNIQUE CHECK(policy_key ~ '^[a-z0-9][a-z0-9_.-]{1,79}$'),
  enabled boolean NOT NULL DEFAULT true,
  warranty_days integer NULL CHECK(warranty_days IS NULL OR warranty_days BETWEEN 0 AND 3650),
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(config)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0)
);

CREATE TABLE IF NOT EXISTS warranty.claims (
  id uuid PRIMARY KEY,
  claim_number varchar(50) NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customer.customers(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  policy_id uuid NULL REFERENCES warranty.policies(id) ON DELETE RESTRICT,
  issue_type varchar(80) NOT NULL CHECK(length(btrim(issue_type)) BETWEEN 1 AND 80),
  issue_description text NOT NULL CHECK(length(btrim(issue_description)) BETWEEN 1 AND 4000),
  preferred_resolution varchar(40) NULL CHECK(preferred_resolution IS NULL OR preferred_resolution IN ('repair','replacement','refund','inspection')),
  status varchar(30) NOT NULL DEFAULT 'requested'
    CHECK(status IN ('requested','under_review','approved','rejected','received','repairing','resolved','closed','cancelled')),
  review_comment text NULL CHECK(review_comment IS NULL OR length(review_comment)<=2000),
  rejection_reason text NULL CHECK(rejection_reason IS NULL OR length(btrim(rejection_reason)) BETWEEN 2 AND 2000),
  condition_note text NULL CHECK(condition_note IS NULL OR length(condition_note)<=4000),
  resolution varchar(40) NULL CHECK(resolution IS NULL OR resolution IN ('repair','replacement','refund','inspection','rejected','no_action')),
  resolution_note text NULL CHECK(resolution_note IS NULL OR length(btrim(resolution_note)) BETWEEN 2 AND 4000),
  refund_id uuid NULL REFERENCES payments.refunds(id) ON DELETE RESTRICT,
  replacement_order_item_id uuid NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  received_at timestamptz NULL,
  repair_started_at timestamptz NULL,
  resolved_at timestamptz NULL,
  closed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK(status<>'under_review' OR reviewed_at IS NOT NULL),
  CHECK(status<>'approved' OR approved_at IS NOT NULL),
  CHECK(status<>'rejected' OR (rejected_at IS NOT NULL AND rejection_reason IS NOT NULL)),
  CHECK(status<>'received' OR received_at IS NOT NULL),
  CHECK(status<>'repairing' OR repair_started_at IS NOT NULL),
  CHECK(status<>'resolved' OR (resolved_at IS NOT NULL AND resolution_note IS NOT NULL AND resolution IS NOT NULL)),
  CHECK(status<>'closed' OR closed_at IS NOT NULL),
  CHECK(resolution<>'refund' OR refund_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_warranty_customer_requested ON warranty.claims(customer_id,requested_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_warranty_order_item ON warranty.claims(order_item_id,requested_at,id);
CREATE INDEX IF NOT EXISTS ix_warranty_status_updated ON warranty.claims(status,updated_at,id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_warranty_active_order_item
  ON warranty.claims(order_item_id)
  WHERE status IN ('requested','under_review','approved','received','repairing');

CREATE TABLE IF NOT EXISTS warranty.status_history (
  id uuid PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES warranty.claims(id) ON DELETE CASCADE,
  from_status varchar(30) NULL,
  to_status varchar(30) NOT NULL,
  reason text NULL,
  actor_type varchar(20) NULL CHECK(actor_type IS NULL OR actor_type IN ('customer','staff','system')),
  actor_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_warranty_history_claim_time ON warranty.status_history(claim_id,created_at,id);

CREATE OR REPLACE FUNCTION returns.prevent_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'returns.status_history is append-only'; END $$;
DROP TRIGGER IF EXISTS trg_returns_history_prevent_mutation ON returns.status_history;
CREATE TRIGGER trg_returns_history_prevent_mutation BEFORE UPDATE OR DELETE ON returns.status_history
FOR EACH ROW EXECUTE FUNCTION returns.prevent_history_mutation();

CREATE OR REPLACE FUNCTION warranty.prevent_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'warranty.status_history is append-only'; END $$;
DROP TRIGGER IF EXISTS trg_warranty_history_prevent_mutation ON warranty.status_history;
CREATE TRIGGER trg_warranty_history_prevent_mutation BEFORE UPDATE OR DELETE ON warranty.status_history
FOR EACH ROW EXECUTE FUNCTION warranty.prevent_history_mutation();


-- Return eligibility: customer and order-item lineage must be exact, and quantity may never
-- exceed the physically delivered quantity after subtracting other non-rejected/non-cancelled returns.
CREATE OR REPLACE FUNCTION returns.assert_return_item(p_item uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE ri returns.return_items%ROWTYPE; rh returns.returns%ROWTYPE; oi orders.order_items%ROWTYPE;
        delivered integer; committed integer; delivered_at timestamptz; window_days integer;
BEGIN
  SELECT * INTO ri FROM returns.return_items WHERE id=p_item;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO rh FROM returns.returns WHERE id=ri.return_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RETURN_HEADER_NOT_FOUND'; END IF;
  SELECT * INTO oi FROM orders.order_items WHERE id=ri.order_item_id;
  IF NOT FOUND OR oi.order_id<>rh.order_id THEN RAISE EXCEPTION 'RETURN_ORDER_ITEM_MISMATCH'; END IF;

  SELECT COALESCE(sum(si.quantity),0)::int,max(s.delivered_at) INTO delivered,delivered_at
  FROM fulfillment.shipment_items si
  JOIN fulfillment.shipments s ON s.id=si.shipment_id
  WHERE s.order_id=rh.order_id AND si.order_item_id=ri.order_item_id AND s.status='delivered';

  IF rh.policy_id IS NOT NULL THEN
    SELECT return_window_days INTO window_days FROM returns.policies WHERE id=rh.policy_id AND enabled=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'RETURN_POLICY_INVALID'; END IF;
    IF window_days IS NOT NULL AND rh.requested_at > delivered_at + make_interval(days=>window_days) THEN
      RAISE EXCEPTION 'RETURN_WINDOW_EXPIRED';
    END IF;
  END IF;

  SELECT COALESCE(sum(other.quantity),0)::int INTO committed
  FROM returns.return_items other
  JOIN returns.returns oh ON oh.id=other.return_id
  WHERE other.order_item_id=ri.order_item_id AND other.id<>ri.id
    AND oh.status NOT IN ('rejected','cancelled');

  IF delivered<=0 THEN RAISE EXCEPTION 'RETURN_ITEM_NOT_DELIVERED'; END IF;
  IF ri.quantity+committed>delivered THEN RAISE EXCEPTION 'RETURN_QUANTITY_EXCEEDS_DELIVERED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION returns.trg_return_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM returns.assert_return_item(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_returns_item_integrity ON returns.return_items;
CREATE CONSTRAINT TRIGGER trg_returns_item_integrity
AFTER INSERT OR UPDATE OR DELETE ON returns.return_items DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION returns.trg_return_item();

CREATE OR REPLACE FUNCTION returns.assert_header(p_return uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r returns.returns%ROWTYPE; o orders.orders%ROWTYPE; cnt integer;
BEGIN
  SELECT * INTO r FROM returns.returns WHERE id=p_return;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO o FROM orders.orders WHERE id=r.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RETURN_ORDER_NOT_FOUND'; END IF;
  IF o.customer_id IS NULL OR o.customer_id<>r.customer_id THEN RAISE EXCEPTION 'RETURN_CUSTOMER_ORDER_MISMATCH'; END IF;
  SELECT count(*) INTO cnt FROM returns.return_items WHERE return_id=r.id;
  IF cnt=0 THEN RAISE EXCEPTION 'RETURN_ITEMS_REQUIRED'; END IF;
END $$;
CREATE OR REPLACE FUNCTION returns.trg_return_header() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM returns.assert_header(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_returns_header_integrity ON returns.returns;
CREATE CONSTRAINT TRIGGER trg_returns_header_integrity
AFTER INSERT OR UPDATE OR DELETE ON returns.returns DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION returns.trg_return_header();

CREATE OR REPLACE FUNCTION returns.guard_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF OLD.status='requested' AND NEW.status IN ('under_review','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='under_review' AND NEW.status IN ('approved','rejected','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='approved' AND NEW.status IN ('in_transit_to_store','received','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='in_transit_to_store' AND NEW.status='received' THEN RETURN NEW; END IF;
  IF OLD.status='received' AND NEW.status='inspecting' THEN RETURN NEW; END IF;
  IF OLD.status='inspecting' AND NEW.status='resolved' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'RETURN_INVALID_STATE_TRANSITION';
END $$;
DROP TRIGGER IF EXISTS trg_returns_transition ON returns.returns;
CREATE TRIGGER trg_returns_transition BEFORE UPDATE OF status ON returns.returns
FOR EACH ROW EXECUTE FUNCTION returns.guard_transition();

-- Warranty eligibility uses delivered fulfillment lineage. Duration is policy-driven and intentionally
-- not enforced until a configured policy provides warranty_days.
CREATE OR REPLACE FUNCTION warranty.assert_claim(p_claim uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c warranty.claims%ROWTYPE; o orders.orders%ROWTYPE; oi orders.order_items%ROWTYPE; delivered_at timestamptz; days integer;
BEGIN
  SELECT * INTO c FROM warranty.claims WHERE id=p_claim;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO o FROM orders.orders WHERE id=c.order_id;
  SELECT * INTO oi FROM orders.order_items WHERE id=c.order_item_id;
  IF o.id IS NULL OR oi.id IS NULL OR oi.order_id<>c.order_id THEN RAISE EXCEPTION 'WARRANTY_ORDER_ITEM_MISMATCH'; END IF;
  IF o.customer_id IS NULL OR o.customer_id<>c.customer_id THEN RAISE EXCEPTION 'WARRANTY_CUSTOMER_ORDER_MISMATCH'; END IF;

  SELECT max(s.delivered_at) INTO delivered_at
  FROM fulfillment.shipment_items si
  JOIN fulfillment.shipments s ON s.id=si.shipment_id
  WHERE s.order_id=c.order_id AND si.order_item_id=c.order_item_id AND s.status='delivered';
  IF delivered_at IS NULL THEN RAISE EXCEPTION 'WARRANTY_ITEM_NOT_DELIVERED'; END IF;

  IF c.policy_id IS NOT NULL THEN
    SELECT warranty_days INTO days FROM warranty.policies WHERE id=c.policy_id AND enabled=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'WARRANTY_POLICY_INVALID'; END IF;
    IF days IS NOT NULL AND c.requested_at > delivered_at + make_interval(days=>days) THEN
      RAISE EXCEPTION 'WARRANTY_WINDOW_EXPIRED';
    END IF;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION warranty.trg_claim() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM warranty.assert_claim(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_warranty_claim_integrity ON warranty.claims;
CREATE CONSTRAINT TRIGGER trg_warranty_claim_integrity
AFTER INSERT OR UPDATE OR DELETE ON warranty.claims DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION warranty.trg_claim();

CREATE OR REPLACE FUNCTION warranty.guard_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF OLD.status='requested' AND NEW.status IN ('under_review','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='under_review' AND NEW.status IN ('approved','rejected','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='approved' AND NEW.status IN ('received','cancelled') THEN RETURN NEW; END IF;
  IF OLD.status='received' AND NEW.status IN ('repairing','resolved') THEN RETURN NEW; END IF;
  IF OLD.status='repairing' AND NEW.status='resolved' THEN RETURN NEW; END IF;
  IF OLD.status='resolved' AND NEW.status='closed' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'WARRANTY_INVALID_STATE_TRANSITION';
END $$;
DROP TRIGGER IF EXISTS trg_warranty_transition ON warranty.claims;
CREATE TRIGGER trg_warranty_transition BEFORE UPDATE OF status ON warranty.claims
FOR EACH ROW EXECUTE FUNCTION warranty.guard_transition();

-- Financial resolution cannot point to a refund belonging to a different order/payment.
CREATE OR REPLACE FUNCTION returns.assert_refund_link(p_item uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE oid uuid; rid uuid; poid uuid;
BEGIN
  SELECT r.order_id,ri.refund_id INTO oid,rid
  FROM returns.return_items ri JOIN returns.returns r ON r.id=ri.return_id WHERE ri.id=p_item;
  IF rid IS NULL THEN RETURN; END IF;
  SELECT p.order_id INTO poid FROM payments.refunds rf JOIN payments.payments p ON p.id=rf.payment_id WHERE rf.id=rid;
  IF poid IS NULL OR poid<>oid THEN RAISE EXCEPTION 'RETURN_REFUND_ORDER_MISMATCH'; END IF;
END $$;
CREATE OR REPLACE FUNCTION returns.trg_refund_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM returns.assert_refund_link(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_return_refund_link ON returns.return_items;
CREATE CONSTRAINT TRIGGER trg_return_refund_link
AFTER INSERT OR UPDATE OF refund_id,return_id ON returns.return_items DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION returns.trg_refund_link();

CREATE OR REPLACE FUNCTION warranty.assert_refund_link(p_claim uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE oid uuid; rid uuid; poid uuid;
BEGIN
  SELECT order_id,refund_id INTO oid,rid FROM warranty.claims WHERE id=p_claim;
  IF rid IS NULL THEN RETURN; END IF;
  SELECT p.order_id INTO poid FROM payments.refunds rf JOIN payments.payments p ON p.id=rf.payment_id WHERE rf.id=rid;
  IF poid IS NULL OR poid<>oid THEN RAISE EXCEPTION 'WARRANTY_REFUND_ORDER_MISMATCH'; END IF;
END $$;
CREATE OR REPLACE FUNCTION warranty.trg_refund_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM warranty.assert_refund_link(COALESCE(NEW.id,OLD.id)); RETURN COALESCE(NEW,OLD); END $$;
DROP TRIGGER IF EXISTS trg_warranty_refund_link ON warranty.claims;
CREATE CONSTRAINT TRIGGER trg_warranty_refund_link
AFTER INSERT OR UPDATE OF refund_id,order_id ON warranty.claims DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION warranty.trg_refund_link();

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('returns.view','returns','مشاهده درخواست‌های مرجوعی','normal'),
 ('returns.review','returns','بررسی و تایید یا رد مرجوعی','high'),
 ('returns.receive','returns','ثبت دریافت کالای مرجوعی','high'),
 ('returns.inspect','returns','بازرسی کالای مرجوعی','high'),
 ('returns.resolve','returns','تعیین تکلیف مالی و موجودی مرجوعی','critical'),
 ('warranty.view','warranty','مشاهده درخواست‌های گارانتی','normal'),
 ('warranty.review','warranty','بررسی و تایید یا رد گارانتی','high'),
 ('warranty.receive','warranty','ثبت دریافت کالای گارانتی','high'),
 ('warranty.repair','warranty','ثبت و مدیریت تعمیر گارانتی','high'),
 ('warranty.resolve','warranty','تعیین تکلیف گارانتی','critical')
ON CONFLICT(key) DO NOTHING;

COMMIT;
