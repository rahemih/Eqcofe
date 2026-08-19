CREATE SCHEMA IF NOT EXISTS procurement;
CREATE SEQUENCE IF NOT EXISTS procurement.purchase_request_number_seq;
CREATE SEQUENCE IF NOT EXISTS procurement.purchase_order_number_seq;
CREATE SEQUENCE IF NOT EXISTS procurement.goods_receipt_number_seq;
CREATE SEQUENCE IF NOT EXISTS procurement.landed_cost_number_seq;
CREATE SEQUENCE IF NOT EXISTS procurement.purchase_return_number_seq;


CREATE TABLE procurement.suppliers (
  id uuid PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  name_fa varchar(200) NOT NULL,
  legal_name varchar(250) NULL,
  national_id varchar(30) NULL,
  mobile varchar(30) NULL,
  phone varchar(30) NULL,
  email varchar(254) NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','blocked')),
  payment_terms_days integer NOT NULL DEFAULT 0 CHECK(payment_terms_days>=0),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX uq_supplier_national_id ON procurement.suppliers(national_id) WHERE national_id IS NOT NULL;

CREATE TABLE procurement.purchase_requests (
  id uuid PRIMARY KEY,
  request_number varchar(40) NOT NULL UNIQUE,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  status varchar(30) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','rejected','converted','cancelled')),
  requested_by uuid NULL, approved_by uuid NULL, reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz NULL, approved_at timestamptz NULL, version bigint NOT NULL DEFAULT 1
);
CREATE TABLE procurement.purchase_request_items (
  id uuid PRIMARY KEY, purchase_request_id uuid NOT NULL REFERENCES procurement.purchase_requests(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  requested_quantity integer NOT NULL CHECK(requested_quantity>0), note text NULL,
  UNIQUE(purchase_request_id,variant_id)
);

CREATE TABLE procurement.purchase_orders (
  id uuid PRIMARY KEY, po_number varchar(40) NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES procurement.suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  purchase_request_id uuid NULL REFERENCES procurement.purchase_requests(id) ON DELETE RESTRICT,
  status varchar(30) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','sent','partially_received','received','closed','cancelled')),
  expected_at timestamptz NULL, submitted_at timestamptz NULL, approved_at timestamptz NULL, sent_at timestamptz NULL, closed_at timestamptz NULL,
  created_by uuid NULL, approved_by uuid NULL, cancellation_reason text NULL,
  subtotal_toman bigint NOT NULL DEFAULT 0 CHECK(subtotal_toman>=0), discount_toman bigint NOT NULL DEFAULT 0 CHECK(discount_toman>=0), additional_cost_toman bigint NOT NULL DEFAULT 0 CHECK(additional_cost_toman>=0), total_toman bigint NOT NULL DEFAULT 0 CHECK(total_toman>=0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 1
);
CREATE TABLE procurement.purchase_order_items (
  id uuid PRIMARY KEY, purchase_order_id uuid NOT NULL REFERENCES procurement.purchase_orders(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  ordered_quantity integer NOT NULL CHECK(ordered_quantity>0), received_quantity integer NOT NULL DEFAULT 0 CHECK(received_quantity>=0), cancelled_quantity integer NOT NULL DEFAULT 0 CHECK(cancelled_quantity>=0),
  unit_cost_toman bigint NOT NULL CHECK(unit_cost_toman>=0), discount_toman bigint NOT NULL DEFAULT 0 CHECK(discount_toman>=0), tax_toman bigint NOT NULL DEFAULT 0 CHECK(tax_toman>=0),
  CHECK(received_quantity+cancelled_quantity<=ordered_quantity), UNIQUE(purchase_order_id,variant_id)
);

CREATE TABLE procurement.goods_receipts (
  id uuid PRIMARY KEY, receipt_number varchar(40) NOT NULL UNIQUE,
  purchase_order_id uuid NULL REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES procurement.suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','posted','cancelled','reversed')),
  received_at timestamptz NULL, posted_at timestamptz NULL, reversed_at timestamptz NULL, created_by uuid NULL, posted_by uuid NULL, reversal_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 1
);
CREATE TABLE procurement.goods_receipt_items (
  id uuid PRIMARY KEY, goods_receipt_id uuid NOT NULL REFERENCES procurement.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id uuid NULL REFERENCES procurement.purchase_order_items(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  received_quantity integer NOT NULL CHECK(received_quantity>0), accepted_quantity integer NOT NULL DEFAULT 0 CHECK(accepted_quantity>=0), quarantine_quantity integer NOT NULL DEFAULT 0 CHECK(quarantine_quantity>=0), rejected_quantity integer NOT NULL DEFAULT 0 CHECK(rejected_quantity>=0),
  unit_cost_toman bigint NOT NULL CHECK(unit_cost_toman>=0),
  CHECK(accepted_quantity+quarantine_quantity+rejected_quantity=received_quantity), UNIQUE(goods_receipt_id,variant_id)
);

CREATE TABLE procurement.landed_costs (
  id uuid PRIMARY KEY, reference_number varchar(50) NOT NULL UNIQUE,
  purchase_order_id uuid NULL REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
  goods_receipt_id uuid NULL REFERENCES procurement.goods_receipts(id) ON DELETE RESTRICT,
  cost_type varchar(30) NOT NULL CHECK(cost_type IN ('shipping','insurance','customs','handling','other')),
  amount_toman bigint NOT NULL CHECK(amount_toman>=0), allocation_method varchar(20) NOT NULL DEFAULT 'quantity' CHECK(allocation_method IN ('quantity','value','manual')),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','finalized','cancelled')),
  finalized_at timestamptz NULL, created_by uuid NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 1,
  CHECK(purchase_order_id IS NOT NULL OR goods_receipt_id IS NOT NULL)
);
CREATE TABLE procurement.landed_cost_allocations (
  id uuid PRIMARY KEY, landed_cost_id uuid NOT NULL REFERENCES procurement.landed_costs(id) ON DELETE RESTRICT,
  goods_receipt_item_id uuid NOT NULL REFERENCES procurement.goods_receipt_items(id) ON DELETE RESTRICT,
  allocated_amount_toman bigint NOT NULL CHECK(allocated_amount_toman>=0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(landed_cost_id,goods_receipt_item_id)
);

CREATE TABLE inventory.cost_revaluations (
  id uuid PRIMARY KEY, goods_receipt_item_id uuid NOT NULL, source_landed_cost_id uuid NOT NULL REFERENCES procurement.landed_costs(id) ON DELETE RESTRICT,
  amount_toman bigint NOT NULL CHECK(amount_toman>=0), inventory_amount_toman bigint NOT NULL CHECK(inventory_amount_toman>=0), consumed_cogs_amount_toman bigint NOT NULL CHECK(consumed_cogs_amount_toman>=0), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_landed_cost_id,goods_receipt_item_id)
);
ALTER TABLE inventory.cost_layers ADD CONSTRAINT fk_cost_layer_goods_receipt_item FOREIGN KEY(goods_receipt_item_id) REFERENCES procurement.goods_receipt_items(id) ON DELETE RESTRICT;
ALTER TABLE inventory.cost_revaluations ADD CONSTRAINT fk_cost_revaluation_goods_receipt_item FOREIGN KEY(goods_receipt_item_id) REFERENCES procurement.goods_receipt_items(id) ON DELETE RESTRICT;

CREATE TABLE procurement.supplier_invoices (
 id uuid PRIMARY KEY, supplier_id uuid NOT NULL REFERENCES procurement.suppliers(id) ON DELETE RESTRICT, purchase_order_id uuid NULL REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
 invoice_number varchar(80) NOT NULL, invoice_date date NOT NULL, amount_toman bigint NOT NULL CHECK(amount_toman>=0), status varchar(20) NOT NULL DEFAULT 'recorded' CHECK(status IN ('recorded','matched','disputed','cancelled')), review_note text NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 1, UNIQUE(supplier_id,invoice_number)
);

CREATE TABLE procurement.purchase_returns (
 id uuid PRIMARY KEY, return_number varchar(40) NOT NULL UNIQUE, supplier_id uuid NOT NULL REFERENCES procurement.suppliers(id) ON DELETE RESTRICT, warehouse_id uuid NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
 goods_receipt_id uuid NULL REFERENCES procurement.goods_receipts(id) ON DELETE RESTRICT, status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','shipped','completed','cancelled')),
 reason text NOT NULL, created_by uuid NULL, approved_by uuid NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version bigint NOT NULL DEFAULT 1
);
CREATE TABLE procurement.purchase_return_items (
 id uuid PRIMARY KEY, purchase_return_id uuid NOT NULL REFERENCES procurement.purchase_returns(id) ON DELETE CASCADE, variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT, quantity integer NOT NULL CHECK(quantity>0), stock_bucket varchar(20) NOT NULL DEFAULT 'quarantine' CHECK(stock_bucket IN ('sellable','quarantine','damaged')), UNIQUE(purchase_return_id,variant_id)
);

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('procurement.view','procurement','مشاهده خرید و تامین','normal'),('procurement.supplier.manage','procurement','مدیریت تامین‌کننده','high'),('procurement.request.manage','procurement','مدیریت درخواست خرید','high'),('procurement.request.approve','procurement','تایید درخواست خرید','critical'),('procurement.po.manage','procurement','مدیریت سفارش خرید','high'),('procurement.po.approve','procurement','تایید سفارش خرید','critical'),('procurement.receipt.manage','procurement','مدیریت رسید کالا','high'),('procurement.receipt.post','procurement','ثبت قطعی رسید کالا','critical'),('procurement.receipt.reverse','procurement','برگشت رسید کالا','critical'),('procurement.landed_cost.manage','procurement','مدیریت هزینه جانبی','critical'),('procurement.invoice.manage','procurement','مدیریت فاکتور تامین‌کننده','high'),('procurement.return.manage','procurement','مرجوعی به تامین‌کننده','critical')
ON CONFLICT(key) DO NOTHING;
