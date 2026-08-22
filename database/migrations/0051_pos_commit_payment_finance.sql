BEGIN;

ALTER TABLE pos.physical_sales DROP CONSTRAINT IF EXISTS physical_sales_status_check;
ALTER TABLE pos.physical_sales
  ADD CONSTRAINT physical_sales_status_check CHECK (status IN ('draft','committed','voided'));

ALTER TABLE pos.physical_sales
  ADD COLUMN warehouse_id uuid NULL,
  ADD COLUMN payment_receipt_id uuid NULL,
  ADD COLUMN total_cost_toman bigint NULL CHECK (total_cost_toman IS NULL OR total_cost_toman >= 0),
  ADD COLUMN committed_at timestamptz NULL;

ALTER TABLE pos.physical_sales
  ADD CONSTRAINT physical_sales_commit_shape_check CHECK (
    (status='committed' AND warehouse_id IS NOT NULL AND payment_receipt_id IS NOT NULL AND total_cost_toman IS NOT NULL AND committed_at IS NOT NULL AND voided_at IS NULL)
    OR (status='draft' AND committed_at IS NULL AND voided_at IS NULL)
    OR (status='voided' AND committed_at IS NULL AND voided_at IS NOT NULL)
  );

CREATE TABLE payments.physical_sale_receipts (
  id uuid PRIMARY KEY,
  sale_id uuid NOT NULL UNIQUE REFERENCES pos.physical_sales(id) ON DELETE RESTRICT,
  amount_toman bigint NOT NULL CHECK (amount_toman > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','card')),
  external_reference text NULL CHECK (external_reference IS NULL OR char_length(external_reference) BETWEEN 1 AND 120),
  confirmed_by uuid NOT NULL REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pos.physical_sales
  ADD CONSTRAINT physical_sales_payment_receipt_fk
  FOREIGN KEY (payment_receipt_id) REFERENCES payments.physical_sale_receipts(id) ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE finance.pos_sale_financial_facts (
  sale_id uuid PRIMARY KEY REFERENCES pos.physical_sales(id) ON DELETE RESTRICT,
  source_event_id uuid NOT NULL UNIQUE,
  revenue_toman bigint NOT NULL CHECK (revenue_toman >= 0),
  cogs_toman bigint NOT NULL CHECK (cogs_toman >= 0),
  gross_profit_toman bigint NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (revenue_toman - cogs_toman = gross_profit_toman)
);

COMMIT;
