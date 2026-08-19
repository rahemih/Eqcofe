BEGIN;

-- EQCOFE Step 46 / A9 — Customer Club / Points MVP Foundation.
-- Points are non-cash, non-transferable units. No Toman conversion, wallet, withdrawal or transfer semantics.

ALTER TABLE loyalty.points_entries DROP CONSTRAINT IF EXISTS points_entries_entry_type_check;
ALTER TABLE loyalty.points_entries ADD CONSTRAINT points_entries_entry_type_check
  CHECK(entry_type IN ('earn','redeem','expire','adjust','reverse'));

ALTER TABLE loyalty.points_entries
  ADD COLUMN IF NOT EXISTS reverses_entry_id uuid NULL REFERENCES loyalty.points_entries(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object');

CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_points_single_reversal
  ON loyalty.points_entries(reverses_entry_id) WHERE reverses_entry_id IS NOT NULL;

ALTER TABLE loyalty.points_entries DROP CONSTRAINT IF EXISTS ck_loyalty_points_direction;
ALTER TABLE loyalty.points_entries ADD CONSTRAINT ck_loyalty_points_direction CHECK(
  (entry_type='earn' AND points_delta > 0 AND reverses_entry_id IS NULL)
  OR (entry_type IN ('redeem','expire') AND points_delta < 0 AND reverses_entry_id IS NULL)
  OR (entry_type='adjust' AND reverses_entry_id IS NULL)
  OR (entry_type='reverse' AND reverses_entry_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION loyalty.guard_points_entry_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_balance bigint; original loyalty.points_entries%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.customer_id::text, 46));

  IF NEW.entry_type='reverse' THEN
    SELECT * INTO original FROM loyalty.points_entries WHERE id=NEW.reverses_entry_id FOR UPDATE;
    IF NOT FOUND OR original.customer_id<>NEW.customer_id OR original.entry_type='reverse' OR NEW.points_delta<>-original.points_delta THEN
      RAISE EXCEPTION 'LOYALTY_INVALID_REVERSAL';
    END IF;
  END IF;

  SELECT COALESCE(sum(points_delta),0) INTO current_balance
  FROM loyalty.points_entries WHERE customer_id=NEW.customer_id;
  IF current_balance + NEW.points_delta < 0 THEN RAISE EXCEPTION 'LOYALTY_NEGATIVE_BALANCE'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_loyalty_non_negative_points_balance ON loyalty.points_entries;
DROP TRIGGER IF EXISTS trg_loyalty_points_entry_integrity ON loyalty.points_entries;
CREATE TRIGGER trg_loyalty_points_entry_integrity
BEFORE INSERT ON loyalty.points_entries
FOR EACH ROW EXECUTE FUNCTION loyalty.guard_points_entry_integrity();

CREATE OR REPLACE FUNCTION loyalty.forbid_points_entry_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LOYALTY_LEDGER_IMMUTABLE'; END $$;
DROP TRIGGER IF EXISTS trg_loyalty_points_immutable ON loyalty.points_entries;
CREATE TRIGGER trg_loyalty_points_immutable BEFORE UPDATE OR DELETE ON loyalty.points_entries
FOR EACH ROW EXECUTE FUNCTION loyalty.forbid_points_entry_mutation();

CREATE INDEX IF NOT EXISTS ix_loyalty_points_customer_type_time
  ON loyalty.points_entries(customer_id,entry_type,created_at DESC,id);

COMMIT;
