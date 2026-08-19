CREATE SCHEMA IF NOT EXISTS inventory;

CREATE TABLE IF NOT EXISTS inventory.warehouses (
  id uuid PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  name_fa varchar(150) NOT NULL,
  warehouse_type varchar(30) NOT NULL CHECK (warehouse_type IN ('central','physical_store','overflow','returns')),
  is_active boolean NOT NULL DEFAULT true,
  physical_protection_percent numeric(7,4) NOT NULL DEFAULT 20 CHECK (physical_protection_percent >= 0 AND physical_protection_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inventory.stock_balances (
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  on_hand integer NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  allocated integer NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  damaged integer NOT NULL DEFAULT 0 CHECK (damaged >= 0),
  quarantine integer NOT NULL DEFAULT 0 CHECK (quarantine >= 0),
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (warehouse_id, variant_id),
  CONSTRAINT ck_stock_components_not_exceed_on_hand CHECK (reserved + allocated + damaged + quarantine <= on_hand)
);

CREATE TABLE IF NOT EXISTS inventory.reservations (
  id uuid PRIMARY KEY,
  cart_id uuid NULL,
  order_id uuid NULL,
  customer_id uuid NULL,
  status varchar(30) NOT NULL CHECK (status IN ('active','payment_pending','converted','released','expired','late_payment_review','cancelled')),
  expires_at timestamptz NOT NULL,
  payment_grace_until timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1,
  CHECK (expires_at > created_at),
  CHECK (payment_grace_until IS NULL OR payment_grace_until >= expires_at)
);
CREATE INDEX IF NOT EXISTS ix_reservations_status_expires ON inventory.reservations(status, expires_at);

CREATE TABLE IF NOT EXISTS inventory.reservation_items (
  id uuid PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES inventory.reservations(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  allocated_quantity integer NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0 AND allocated_quantity <= quantity),
  released_quantity integer NOT NULL DEFAULT 0 CHECK (released_quantity >= 0 AND allocated_quantity + released_quantity <= quantity),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, warehouse_id, variant_id)
);

CREATE TABLE IF NOT EXISTS inventory.allocations (
  id uuid PRIMARY KEY,
  order_item_id uuid NOT NULL,
  reservation_id uuid NULL REFERENCES inventory.reservations(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  status varchar(20) NOT NULL CHECK (status IN ('allocated','picked','shipped','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1,
  UNIQUE(order_item_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS inventory.transfers (
  id uuid PRIMARY KEY,
  source_warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  destination_warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  status varchar(30) NOT NULL CHECK (status IN ('draft','approved','shipped','received','cancelled')),
  requested_by uuid NULL,
  approved_by uuid NULL,
  shipped_at timestamptz NULL,
  received_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1,
  CHECK (source_warehouse_id <> destination_warehouse_id)
);

CREATE TABLE IF NOT EXISTS inventory.transfer_items (
  id uuid PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES inventory.transfers(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  shipped_quantity integer NOT NULL DEFAULT 0 CHECK (shipped_quantity >= 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  UNIQUE(transfer_id, variant_id),
  CHECK (shipped_quantity <= requested_quantity),
  CHECK (received_quantity <= shipped_quantity)
);

CREATE TABLE IF NOT EXISTS inventory.cost_layers (
  id uuid PRIMARY KEY,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  goods_receipt_item_id uuid NULL,
  transfer_parent_layer_id uuid NULL REFERENCES inventory.cost_layers(id) ON DELETE RESTRICT,
  return_parent_consumption_id uuid NULL,
  condition_parent_layer_id uuid NULL REFERENCES inventory.cost_layers(id) ON DELETE RESTRICT,
  stock_bucket varchar(20) NOT NULL DEFAULT 'sellable' CHECK (stock_bucket IN ('sellable','quarantine','damaged')),
  received_quantity integer NOT NULL CHECK (received_quantity > 0),
  remaining_quantity integer NOT NULL CHECK (remaining_quantity >= 0 AND remaining_quantity <= received_quantity),
  base_unit_cost_toman bigint NOT NULL CHECK (base_unit_cost_toman >= 0),
  landed_unit_cost_toman bigint NOT NULL CHECK (landed_unit_cost_toman >= 0),
  effective_unit_cost_toman bigint NOT NULL CHECK (effective_unit_cost_toman >= 0),
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cost_layers_fifo ON inventory.cost_layers(warehouse_id, variant_id, stock_bucket, received_at, id) WHERE remaining_quantity > 0;

CREATE TABLE IF NOT EXISTS inventory.movements (
  id uuid PRIMARY KEY,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  movement_type varchar(40) NOT NULL,
  quantity_delta integer NOT NULL,
  bucket_from varchar(20) NULL CHECK (bucket_from IS NULL OR bucket_from IN ('sellable','quarantine','damaged')),
  bucket_to varchar(20) NULL CHECK (bucket_to IS NULL OR bucket_to IN ('sellable','quarantine','damaged')),
  cost_layer_id uuid NULL REFERENCES inventory.cost_layers(id) ON DELETE RESTRICT,
  reservation_id uuid NULL REFERENCES inventory.reservations(id) ON DELETE RESTRICT,
  allocation_id uuid NULL REFERENCES inventory.allocations(id) ON DELETE RESTRICT,
  transfer_id uuid NULL REFERENCES inventory.transfers(id) ON DELETE RESTRICT,
  return_item_id uuid NULL,
  source_event_id uuid NULL,
  reason_code varchar(80) NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_inventory_movement_effect CHECK (quantity_delta <> 0 OR (bucket_from IS NOT NULL AND bucket_to IS NOT NULL AND bucket_from <> bucket_to))
);
CREATE INDEX IF NOT EXISTS ix_inventory_movements_variant ON inventory.movements(warehouse_id, variant_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movement_source_event ON inventory.movements(source_event_id) WHERE source_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory.cost_layer_consumptions (
  id uuid PRIMARY KEY,
  cost_layer_id uuid NOT NULL REFERENCES inventory.cost_layers(id) ON DELETE RESTRICT,
  order_item_id uuid NULL,
  inventory_movement_id uuid NOT NULL REFERENCES inventory.movements(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost_toman bigint NOT NULL CHECK (unit_cost_toman >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION inventory.prevent_movement_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'inventory.movements is append-only';
END $$;
DROP TRIGGER IF EXISTS trg_inventory_prevent_movement_update ON inventory.movements;
CREATE TRIGGER trg_inventory_prevent_movement_update BEFORE UPDATE OR DELETE ON inventory.movements FOR EACH ROW EXECUTE FUNCTION inventory.prevent_movement_mutation();

CREATE TABLE IF NOT EXISTS inventory.transfer_cost_parts (
  id uuid PRIMARY KEY,
  transfer_item_id uuid NOT NULL REFERENCES inventory.transfer_items(id) ON DELETE RESTRICT,
  source_cost_layer_id uuid NOT NULL REFERENCES inventory.cost_layers(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost_toman bigint NOT NULL CHECK (unit_cost_toman >= 0),
  destination_cost_layer_id uuid NULL REFERENCES inventory.cost_layers(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('inventory.view','inventory','مشاهده موجودی','normal'),
 ('inventory.warehouse.manage','inventory','مدیریت انبار و سهم فروش حضوری','high'),
 ('inventory.adjust','inventory','اصلاح موجودی','critical'),
 ('inventory.reserve','inventory','مدیریت رزرو موجودی','high'),
 ('inventory.allocate','inventory','تخصیص و Pick موجودی','high'),
 ('inventory.consume','inventory','خروج قطعی کالا و ثبت بهای تمام‌شده','critical'),
 ('inventory.transfer','inventory','انتقال بین انبارها','high')
ON CONFLICT (key) DO NOTHING;
