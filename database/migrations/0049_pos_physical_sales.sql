BEGIN;

CREATE SCHEMA IF NOT EXISTS pos;

CREATE TABLE pos.physical_sales (
  id uuid PRIMARY KEY,
  client_command_id uuid NOT NULL UNIQUE,
  staff_actor_id uuid NOT NULL REFERENCES iam.accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','voided')),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz NULL,
  CHECK ((status = 'voided') = (voided_at IS NOT NULL))
);

CREATE TABLE pos.physical_sale_lines (
  id uuid PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES pos.physical_sales(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, variant_id)
);

CREATE INDEX idx_pos_physical_sales_staff_created
  ON pos.physical_sales(staff_actor_id, created_at DESC);
CREATE INDEX idx_pos_physical_sale_lines_sale
  ON pos.physical_sale_lines(sale_id);

COMMIT;
