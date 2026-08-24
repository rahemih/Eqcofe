BEGIN;

CREATE TABLE analytics.fulfillment_operational_metrics (
  order_id uuid PRIMARY KEY,
  status text NOT NULL CHECK(status IN ('unfulfilled','partially_allocated','allocated','preparing','partially_shipped','shipped','partially_delivered','delivered','cancelled')),
  created_at timestamptz NOT NULL,
  preparation_started_at timestamptz NULL,
  completed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  source_version integer NOT NULL CHECK(source_version > 0),
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CHECK(preparation_started_at IS NULL OR preparation_started_at >= created_at),
  CHECK(completed_at IS NULL OR completed_at >= created_at),
  CHECK(cancelled_at IS NULL OR cancelled_at >= created_at)
);
CREATE INDEX analytics_fulfillment_status_watermark_idx ON analytics.fulfillment_operational_metrics(status,source_watermark DESC,order_id);

CREATE TABLE analytics.shipment_operational_metrics (
  shipment_id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  carrier_provider_id uuid NULL,
  status text NOT NULL CHECK(status IN ('draft','ready','handed_over','in_transit','delivered','delivery_failed','cancelled','returned')),
  created_at timestamptz NOT NULL,
  ready_at timestamptz NULL,
  handed_over_at timestamptz NULL,
  delivered_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  last_tracking_at timestamptz NULL,
  source_version integer NOT NULL CHECK(source_version > 0),
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now(),
  CHECK(ready_at IS NULL OR ready_at >= created_at),
  CHECK(handed_over_at IS NULL OR handed_over_at >= created_at),
  CHECK(delivered_at IS NULL OR delivered_at >= created_at),
  CHECK(cancelled_at IS NULL OR cancelled_at >= created_at)
);
CREATE INDEX analytics_shipment_status_watermark_idx ON analytics.shipment_operational_metrics(status,source_watermark DESC,shipment_id);

CREATE TABLE analytics.return_operational_metrics (
  return_id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  status text NOT NULL CHECK(status IN ('requested','under_review','approved','rejected','in_transit_to_store','received','inspecting','resolved','cancelled')),
  requested_at timestamptz NOT NULL,
  reviewed_at timestamptz NULL,
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  received_at timestamptz NULL,
  inspection_started_at timestamptz NULL,
  resolved_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  source_version integer NOT NULL CHECK(source_version > 0),
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_return_status_watermark_idx ON analytics.return_operational_metrics(status,source_watermark DESC,return_id);

CREATE TABLE analytics.warranty_operational_metrics (
  claim_id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  status text NOT NULL CHECK(status IN ('requested','under_review','approved','rejected','received','repairing','resolved','closed','cancelled')),
  requested_at timestamptz NOT NULL,
  reviewed_at timestamptz NULL,
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  received_at timestamptz NULL,
  repair_started_at timestamptz NULL,
  resolved_at timestamptz NULL,
  closed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  source_version integer NOT NULL CHECK(source_version > 0),
  source_watermark timestamptz NOT NULL,
  projected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_warranty_status_watermark_idx ON analytics.warranty_operational_metrics(status,source_watermark DESC,claim_id);

COMMIT;
