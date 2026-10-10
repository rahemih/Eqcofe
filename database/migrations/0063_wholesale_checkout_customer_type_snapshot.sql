BEGIN;

ALTER TABLE cart.checkouts
  ADD COLUMN IF NOT EXISTS customer_type text;

-- Legacy rows predate the immutable quote snapshot. Do not infer historical
-- commerce context from the customer's current mutable profile.
UPDATE cart.checkouts
SET customer_type = 'retail'
WHERE customer_type IS NULL;

ALTER TABLE cart.checkouts
  ALTER COLUMN customer_type SET NOT NULL;

ALTER TABLE cart.checkouts
  DROP CONSTRAINT IF EXISTS ck_checkouts_customer_type;

ALTER TABLE cart.checkouts
  ADD CONSTRAINT ck_checkouts_customer_type
  CHECK (customer_type IN ('retail','wholesale'));

COMMIT;
