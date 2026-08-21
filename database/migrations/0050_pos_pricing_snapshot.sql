BEGIN;

ALTER TABLE pos.physical_sale_lines
  ADD COLUMN base_price_toman bigint NULL CHECK (base_price_toman IS NULL OR base_price_toman >= 0),
  ADD COLUMN discount_toman bigint NULL CHECK (discount_toman IS NULL OR discount_toman >= 0),
  ADD COLUMN unit_price_toman bigint NULL CHECK (unit_price_toman IS NULL OR unit_price_toman >= 0),
  ADD COLUMN pricing_base_price_id uuid NULL,
  ADD COLUMN pricing_rule_ids jsonb NULL,
  ADD COLUMN pricing_customer_type text NULL CHECK (pricing_customer_type IS NULL OR pricing_customer_type IN ('retail','wholesale')),
  ADD COLUMN priced_at timestamptz NULL;

ALTER TABLE pos.physical_sales
  ADD COLUMN subtotal_toman bigint NOT NULL DEFAULT 0 CHECK (subtotal_toman >= 0),
  ADD COLUMN discount_total_toman bigint NOT NULL DEFAULT 0 CHECK (discount_total_toman >= 0),
  ADD COLUMN total_toman bigint NOT NULL DEFAULT 0 CHECK (total_toman >= 0),
  ADD CONSTRAINT ck_pos_sale_totals CHECK (subtotal_toman - discount_total_toman = total_toman);

COMMIT;
