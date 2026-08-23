BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE analytics.projection_checkpoints (
  projection_key text PRIMARY KEY,
  source_cursor text NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_projection_key_nonempty CHECK (length(btrim(projection_key)) > 0),
  CONSTRAINT analytics_source_cursor_nonempty CHECK (length(btrim(source_cursor)) > 0)
);

CREATE TABLE analytics.sales_daily (
  business_date date PRIMARY KEY,
  order_count bigint NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  gross_sales_toman bigint NOT NULL DEFAULT 0 CHECK (gross_sales_toman >= 0),
  paid_sales_toman bigint NOT NULL DEFAULT 0 CHECK (paid_sales_toman >= 0),
  cancelled_count bigint NOT NULL DEFAULT 0 CHECK (cancelled_count >= 0),
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE analytics.inventory_snapshot (
  variant_id uuid PRIMARY KEY,
  available_quantity bigint NOT NULL CHECK (available_quantity >= 0),
  reserved_quantity bigint NOT NULL CHECK (reserved_quantity >= 0),
  stock_state text NOT NULL CHECK (stock_state IN ('in_stock','low_stock','out_of_stock')),
  source_watermark timestamptz NOT NULL,
  captured_at timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE analytics.customer_metrics (
  customer_id uuid PRIMARY KEY,
  order_count bigint NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  lifetime_value_toman bigint NOT NULL DEFAULT 0 CHECK (lifetime_value_toman >= 0),
  last_order_at timestamptz NULL,
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE analytics.profit_daily (
  business_date date PRIMARY KEY,
  revenue_toman bigint NOT NULL DEFAULT 0 CHECK (revenue_toman >= 0),
  cogs_toman bigint NOT NULL DEFAULT 0 CHECK (cogs_toman >= 0),
  operating_cost_toman bigint NOT NULL DEFAULT 0 CHECK (operating_cost_toman >= 0),
  profit_toman bigint NOT NULL,
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_sales_daily_watermark_idx ON analytics.sales_daily(source_watermark DESC);
CREATE INDEX analytics_inventory_snapshot_state_idx ON analytics.inventory_snapshot(stock_state, captured_at DESC);
CREATE INDEX analytics_customer_metrics_last_order_idx ON analytics.customer_metrics(last_order_at DESC NULLS LAST);
CREATE INDEX analytics_profit_daily_watermark_idx ON analytics.profit_daily(source_watermark DESC);

COMMIT;
