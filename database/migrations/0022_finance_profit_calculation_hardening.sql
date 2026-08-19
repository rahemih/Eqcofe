BEGIN;

ALTER TABLE finance.profit_calculations
  ADD COLUMN IF NOT EXISTS calculation_key uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS source_fingerprint char(64) NULL,
  ADD COLUMN IF NOT EXISTS refund_committed_toman bigint NOT NULL DEFAULT 0 CHECK(refund_committed_toman>=0),
  ADD COLUMN IF NOT EXISTS refund_succeeded_toman bigint NOT NULL DEFAULT 0 CHECK(refund_succeeded_toman>=0),
  ADD COLUMN IF NOT EXISTS gross_cogs_toman bigint NOT NULL DEFAULT 0 CHECK(gross_cogs_toman>=0),
  ADD COLUMN IF NOT EXISTS returned_cogs_toman bigint NOT NULL DEFAULT 0 CHECK(returned_cogs_toman>=0),
  ADD COLUMN IF NOT EXISTS shipping_revenue_toman bigint NOT NULL DEFAULT 0 CHECK(shipping_revenue_toman>=0),
  ADD COLUMN IF NOT EXISTS shipping_cost_toman bigint NOT NULL DEFAULT 0 CHECK(shipping_cost_toman>=0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_profit_calculation_key
  ON finance.profit_calculations(calculation_key);

CREATE INDEX IF NOT EXISTS ix_finance_profit_source_fingerprint
  ON finance.profit_calculations(order_id,source_fingerprint,calculated_at DESC,id)
  WHERE source_fingerprint IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_constraint WHERE conname='ck_finance_profit_cogs_components'
      AND conrelid='finance.profit_calculations'::regclass
  ) THEN
    ALTER TABLE finance.profit_calculations ADD CONSTRAINT ck_finance_profit_cogs_components
      CHECK(returned_cogs_toman<=gross_cogs_toman AND cogs_toman=gross_cogs_toman-returned_cogs_toman);
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM pg_constraint WHERE conname='ck_finance_profit_shipping_margin'
      AND conrelid='finance.profit_calculations'::regclass
  ) THEN
    ALTER TABLE finance.profit_calculations ADD CONSTRAINT ck_finance_profit_shipping_margin
      CHECK(shipping_margin_toman=shipping_revenue_toman-shipping_cost_toman);
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM pg_constraint WHERE conname='ck_finance_profit_refund_committed'
      AND conrelid='finance.profit_calculations'::regclass
  ) THEN
    ALTER TABLE finance.profit_calculations ADD CONSTRAINT ck_finance_profit_refund_committed
      CHECK(refund_succeeded_toman<=refund_committed_toman);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.prevent_profit_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCE_PROFIT_SNAPSHOT_IMMUTABLE'; END IF;

  IF OLD.calculation_stage='final' THEN
    RAISE EXCEPTION 'FINANCE_FINAL_PROFIT_IMMUTABLE';
  END IF;

  IF ROW(
    NEW.id,NEW.order_id,NEW.calculation_stage,NEW.net_sales_toman,NEW.cogs_toman,NEW.online_costs_toman,
    NEW.shipping_margin_toman,NEW.profit_before_distribution_toman,NEW.selected_rule_id,
    NEW.physical_owner_percent,NEW.online_owner_percent,NEW.source_snapshot,NEW.supersedes_id,
    NEW.calculated_at,NEW.finalized_at,NEW.finalized_by,NEW.reason,NEW.calculation_key,
    NEW.source_fingerprint,NEW.refund_committed_toman,NEW.refund_succeeded_toman,NEW.gross_cogs_toman,
    NEW.returned_cogs_toman,NEW.shipping_revenue_toman,NEW.shipping_cost_toman
  ) IS DISTINCT FROM ROW(
    OLD.id,OLD.order_id,OLD.calculation_stage,OLD.net_sales_toman,OLD.cogs_toman,OLD.online_costs_toman,
    OLD.shipping_margin_toman,OLD.profit_before_distribution_toman,OLD.selected_rule_id,
    OLD.physical_owner_percent,OLD.online_owner_percent,OLD.source_snapshot,OLD.supersedes_id,
    OLD.calculated_at,OLD.finalized_at,OLD.finalized_by,OLD.reason,OLD.calculation_key,
    OLD.source_fingerprint,OLD.refund_committed_toman,OLD.refund_succeeded_toman,OLD.gross_cogs_toman,
    OLD.returned_cogs_toman,OLD.shipping_revenue_toman,OLD.shipping_cost_toman
  ) THEN RAISE EXCEPTION 'FINANCE_PROFIT_SNAPSHOT_IMMUTABLE'; END IF;

  -- A calculation snapshot may only be superseded by flipping is_current/version/updated metadata.
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_profit_snapshot_immutable ON finance.profit_calculations;
CREATE TRIGGER trg_finance_profit_snapshot_immutable
BEFORE UPDATE OR DELETE ON finance.profit_calculations
FOR EACH ROW EXECUTE FUNCTION finance.prevent_profit_snapshot_mutation();

CREATE OR REPLACE FUNCTION finance.assert_profit_supersession(p_calc uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c finance.profit_calculations%ROWTYPE;
BEGIN
  SELECT * INTO c FROM finance.profit_calculations WHERE id=p_calc;
  IF NOT FOUND THEN RETURN; END IF;
  IF c.supersedes_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM finance.profit_calculations p
    WHERE p.id=c.supersedes_id AND p.order_id=c.order_id AND p.calculation_stage=c.calculation_stage
      AND p.calculated_at<=c.calculated_at
  ) THEN RAISE EXCEPTION 'FINANCE_PROFIT_SUPERSESSION_INVALID'; END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_profit_supersession() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM finance.assert_profit_supersession(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_profit_supersession ON finance.profit_calculations;
CREATE CONSTRAINT TRIGGER trg_finance_profit_supersession
AFTER INSERT OR UPDATE OF supersedes_id ON finance.profit_calculations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.trg_profit_supersession();

COMMIT;
