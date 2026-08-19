BEGIN;

ALTER TABLE finance.profit_rules DROP CONSTRAINT IF EXISTS profit_rules_status_check;
ALTER TABLE finance.profit_rules
  ADD CONSTRAINT profit_rules_status_check CHECK(status IN ('draft','active','expired'));

ALTER TABLE finance.profit_rules
  ALTER COLUMN status SET DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz NULL;

UPDATE finance.profit_rules
SET activated_at=COALESCE(activated_at,created_at)
WHERE status='active' AND activated_at IS NULL;

UPDATE finance.profit_rules
SET expired_at=COALESCE(expired_at,effective_until,updated_at)
WHERE status='expired' AND expired_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_constraint WHERE conname='ck_finance_profit_rule_lifecycle'
      AND conrelid='finance.profit_rules'::regclass
  ) THEN
    ALTER TABLE finance.profit_rules ADD CONSTRAINT ck_finance_profit_rule_lifecycle CHECK(
      (status='draft' AND activated_at IS NULL AND expired_at IS NULL)
      OR (status='active' AND activated_at IS NOT NULL AND expired_at IS NULL)
      OR (status='expired' AND activated_at IS NOT NULL AND expired_at IS NOT NULL)
    );
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM pg_constraint WHERE conname='ck_finance_profit_rule_priority'
      AND conrelid='finance.profit_rules'::regclass
  ) THEN
    ALTER TABLE finance.profit_rules ADD CONSTRAINT ck_finance_profit_rule_priority
      CHECK(priority BETWEEN -1000000 AND 1000000);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.prevent_committed_profit_rule_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.status IN ('active','expired') THEN RAISE EXCEPTION 'FINANCE_COMMITTED_PROFIT_RULE_IMMUTABLE'; END IF;
    RETURN OLD;
  END IF;

  IF OLD.status='active' THEN
    IF NEW.status='expired' THEN
      IF ROW(
        NEW.id,NEW.name_fa,NEW.scope_type,NEW.scope_id,NEW.priority,NEW.physical_owner_percent,
        NEW.online_owner_percent,NEW.effective_from,NEW.created_by,NEW.created_at,NEW.activated_at
      ) IS DISTINCT FROM ROW(
        OLD.id,OLD.name_fa,OLD.scope_type,OLD.scope_id,OLD.priority,OLD.physical_owner_percent,
        OLD.online_owner_percent,OLD.effective_from,OLD.created_by,OLD.created_at,OLD.activated_at
      ) THEN RAISE EXCEPTION 'FINANCE_COMMITTED_PROFIT_RULE_IMMUTABLE'; END IF;
      IF NEW.expired_at IS NULL OR NEW.effective_until IS NULL THEN RAISE EXCEPTION 'FINANCE_PROFIT_RULE_EXPIRE_FIELDS_REQUIRED'; END IF;
      IF NEW.effective_until>NEW.expired_at THEN RAISE EXCEPTION 'FINANCE_PROFIT_RULE_EXPIRE_RANGE_INVALID'; END IF;
      RETURN NEW;
    END IF;
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'FINANCE_COMMITTED_PROFIT_RULE_IMMUTABLE'; END IF;
  ELSIF OLD.status='expired' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'FINANCE_EXPIRED_PROFIT_RULE_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_profit_rule_immutable ON finance.profit_rules;
CREATE TRIGGER trg_finance_profit_rule_immutable
BEFORE UPDATE OR DELETE ON finance.profit_rules
FOR EACH ROW EXECUTE FUNCTION finance.prevent_committed_profit_rule_mutation();

CREATE INDEX IF NOT EXISTS ix_finance_profit_rules_active_resolution
  ON finance.profit_rules(priority DESC,scope_type,scope_id,effective_from DESC,id)
  WHERE status='active';

CREATE OR REPLACE FUNCTION finance.assert_profit_rule_unambiguous() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status<>'active' THEN RETURN NEW; END IF;
  IF EXISTS(
    SELECT 1 FROM finance.profit_rules r
    WHERE r.id<>NEW.id AND r.status='active'
      AND r.scope_type=NEW.scope_type AND r.scope_id IS NOT DISTINCT FROM NEW.scope_id
      AND r.priority=NEW.priority
      AND tstzrange(r.effective_from,r.effective_until,'[)') && tstzrange(NEW.effective_from,NEW.effective_until,'[)')
  ) THEN RAISE EXCEPTION 'FINANCE_PROFIT_RULE_AMBIGUOUS'; END IF;
  RETURN NEW;
END $$;

COMMIT;
