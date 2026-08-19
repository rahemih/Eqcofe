BEGIN;

ALTER TABLE finance.costs
  ADD COLUMN IF NOT EXISTS effect_sign smallint NOT NULL DEFAULT 1 CHECK(effect_sign IN (-1,1)),
  ADD COLUMN IF NOT EXISTS capitalization_source_type varchar(60) NULL,
  ADD COLUMN IF NOT EXISTS capitalization_source_id uuid NULL;


DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_constraint WHERE conname='ck_finance_cost_scope_exclusive'
      AND conrelid='finance.costs'::regclass
  ) THEN
    ALTER TABLE finance.costs ADD CONSTRAINT ck_finance_cost_scope_exclusive
      CHECK(NOT (campaign_id IS NOT NULL AND order_id IS NOT NULL));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_cost_reversal_of
  ON finance.costs(reversal_of_id) WHERE reversal_of_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_cost_capitalization_source
  ON finance.costs(capitalization_source_type,capitalization_source_id)
  WHERE capitalization_source_type IS NOT NULL AND capitalization_source_id IS NOT NULL AND effect_sign=1;

CREATE INDEX IF NOT EXISTS ix_finance_costs_effective_order
  ON finance.costs(order_id,cost_treatment,status,effect_sign,occurred_at,id)
  WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION finance.assert_cost_semantics(p_cost uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c finance.costs%ROWTYPE; original finance.costs%ROWTYPE;
BEGIN
  SELECT * INTO c FROM finance.costs WHERE id=p_cost;
  IF NOT FOUND THEN RETURN; END IF;

  IF c.effect_sign=-1 THEN
    IF c.reversal_of_id IS NULL THEN RAISE EXCEPTION 'FINANCE_COST_REVERSAL_LINK_REQUIRED'; END IF;
    SELECT * INTO original FROM finance.costs WHERE id=c.reversal_of_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'FINANCE_COST_REVERSAL_ORIGINAL_NOT_FOUND'; END IF;
    IF original.effect_sign<>1 THEN RAISE EXCEPTION 'FINANCE_COST_REVERSAL_OF_REVERSAL_FORBIDDEN'; END IF;
    IF original.amount_toman<>c.amount_toman
       OR original.cost_type<>c.cost_type
       OR original.cost_treatment<>c.cost_treatment
       OR original.order_id IS DISTINCT FROM c.order_id
       OR original.order_item_id IS DISTINCT FROM c.order_item_id
       OR original.campaign_id IS DISTINCT FROM c.campaign_id THEN
      RAISE EXCEPTION 'FINANCE_COST_REVERSAL_SNAPSHOT_MISMATCH';
    END IF;
  ELSE
    IF c.reversal_of_id IS NOT NULL THEN RAISE EXCEPTION 'FINANCE_COST_POSITIVE_REVERSAL_LINK_FORBIDDEN'; END IF;
  END IF;

  IF c.cost_treatment='capitalized_into_cost' AND c.status IN ('finalized','reversed') AND c.effect_sign=1 THEN
    IF c.capitalization_source_type IS NULL OR c.capitalization_source_id IS NULL THEN
      RAISE EXCEPTION 'FINANCE_CAPITALIZED_COST_SOURCE_REQUIRED';
    END IF;
  END IF;

  IF c.cost_treatment<>'capitalized_into_cost'
     AND (c.capitalization_source_type IS NOT NULL OR c.capitalization_source_id IS NOT NULL) THEN
    RAISE EXCEPTION 'FINANCE_CAPITALIZATION_SOURCE_UNEXPECTED';
  END IF;

  IF (c.capitalization_source_type IS NULL)<>(c.capitalization_source_id IS NULL) THEN
    RAISE EXCEPTION 'FINANCE_CAPITALIZATION_SOURCE_INCOMPLETE';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_cost_semantics() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM finance.assert_cost_semantics(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_cost_semantics ON finance.costs;
CREATE CONSTRAINT TRIGGER trg_finance_cost_semantics
AFTER INSERT OR UPDATE ON finance.costs
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.trg_cost_semantics();

CREATE OR REPLACE FUNCTION finance.prevent_finalized_cost_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.status='finalized' THEN RAISE EXCEPTION 'FINANCE_FINALIZED_COST_IMMUTABLE'; END IF;
    IF OLD.status='reversed' THEN RAISE EXCEPTION 'FINANCE_REVERSED_COST_IMMUTABLE'; END IF;
    RETURN OLD;
  END IF;

  IF OLD.status='finalized' THEN
    IF NEW.status='reversed' THEN
      IF ROW(
        NEW.id,NEW.order_id,NEW.order_item_id,NEW.campaign_id,NEW.cost_type,NEW.cost_treatment,
        NEW.amount_toman,NEW.occurred_at,NEW.description,NEW.reversal_of_id,NEW.source_event_id,
        NEW.created_by,NEW.finalized_at,NEW.finalized_by,NEW.created_at,NEW.effect_sign,
        NEW.capitalization_source_type,NEW.capitalization_source_id
      ) IS DISTINCT FROM ROW(
        OLD.id,OLD.order_id,OLD.order_item_id,OLD.campaign_id,OLD.cost_type,OLD.cost_treatment,
        OLD.amount_toman,OLD.occurred_at,OLD.description,OLD.reversal_of_id,OLD.source_event_id,
        OLD.created_by,OLD.finalized_at,OLD.finalized_by,OLD.created_at,OLD.effect_sign,
        OLD.capitalization_source_type,OLD.capitalization_source_id
      ) THEN RAISE EXCEPTION 'FINANCE_FINALIZED_COST_IMMUTABLE'; END IF;
      IF NEW.reversed_at IS NULL THEN RAISE EXCEPTION 'FINANCE_COST_REVERSED_AT_REQUIRED'; END IF;
      RETURN NEW;
    END IF;
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'FINANCE_FINALIZED_COST_IMMUTABLE'; END IF;
  ELSIF OLD.status='reversed' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'FINANCE_REVERSED_COST_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_cost_immutable ON finance.costs;
CREATE TRIGGER trg_finance_cost_immutable
BEFORE UPDATE OR DELETE ON finance.costs
FOR EACH ROW EXECUTE FUNCTION finance.prevent_finalized_cost_mutation();

CREATE OR REPLACE FUNCTION finance.assert_cost_reversal_linkage(p_cost uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM finance.costs WHERE id=p_cost;
  IF st='reversed' AND NOT EXISTS(
    SELECT 1 FROM finance.costs r
    WHERE r.reversal_of_id=p_cost AND r.effect_sign=-1 AND r.status='finalized'
  ) THEN RAISE EXCEPTION 'FINANCE_COST_REVERSAL_RECORD_REQUIRED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_cost_reversal_linkage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM finance.assert_cost_reversal_linkage(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_cost_reversal_linkage ON finance.costs;
CREATE CONSTRAINT TRIGGER trg_finance_cost_reversal_linkage
AFTER INSERT OR UPDATE OF status ON finance.costs
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.trg_cost_reversal_linkage();

CREATE OR REPLACE FUNCTION finance.assert_cost_order_item_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_item_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM orders.order_items oi WHERE oi.id=NEW.order_item_id AND oi.order_id=NEW.order_id
  ) THEN RAISE EXCEPTION 'FINANCE_COST_ORDER_ITEM_MISMATCH'; END IF;
  RETURN NEW;
END $$;

COMMIT;
