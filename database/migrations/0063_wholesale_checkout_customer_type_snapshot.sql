BEGIN;

ALTER TABLE cart.checkouts
  ADD COLUMN IF NOT EXISTS customer_type text;

UPDATE cart.checkouts c
SET customer_type = cu.customer_type
FROM customer.customers cu
WHERE c.customer_id = cu.id
  AND c.customer_type IS NULL;

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
