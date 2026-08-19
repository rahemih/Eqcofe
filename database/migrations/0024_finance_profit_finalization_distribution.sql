BEGIN;

ALTER TABLE finance.profit_distributions
  ADD COLUMN IF NOT EXISTS effect_sign smallint NOT NULL DEFAULT 1 CHECK(effect_sign IN (-1,1));

ALTER TABLE finance.profit_distributions
  DROP CONSTRAINT IF EXISTS profit_distributions_profit_calculation_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_distribution_positive_calculation
  ON finance.profit_distributions(profit_calculation_id) WHERE effect_sign=1;

CREATE INDEX IF NOT EXISTS ix_finance_distribution_reversal
  ON finance.profit_distributions(reversal_of_id) WHERE reversal_of_id IS NOT NULL;

CREATE OR REPLACE FUNCTION finance.prevent_profit_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCE_PROFIT_SNAPSHOT_IMMUTABLE'; END IF;

  IF OLD.calculation_stage='final' THEN
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
    ) THEN RAISE EXCEPTION 'FINANCE_FINAL_PROFIT_IMMUTABLE'; END IF;
    RETURN NEW;
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
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION finance.assert_distribution_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c finance.profit_calculations%ROWTYPE; original finance.profit_distributions%ROWTYPE;
BEGIN
  SELECT * INTO c FROM finance.profit_calculations WHERE id=NEW.profit_calculation_id;
  IF NOT FOUND OR c.order_id<>NEW.order_id OR c.calculation_stage<>'final' THEN
    RAISE EXCEPTION 'FINANCE_DISTRIBUTION_CALCULATION_INVALID';
  END IF;

  IF NEW.effect_sign=1 THEN
    IF NEW.reversal_of_id IS NOT NULL THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_POSITIVE_REVERSAL_LINK_FORBIDDEN'; END IF;
    IF NOT c.is_current THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_CALCULATION_NOT_CURRENT'; END IF;
    IF NEW.distributable_base_toman<>c.profit_before_distribution_toman
       OR NEW.physical_owner_percent<>c.physical_owner_percent
       OR NEW.online_owner_percent<>c.online_owner_percent THEN
      RAISE EXCEPTION 'FINANCE_DISTRIBUTION_SNAPSHOT_MISMATCH';
    END IF;
  ELSE
    IF NEW.reversal_of_id IS NULL THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_REVERSAL_LINK_REQUIRED'; END IF;
    SELECT * INTO original FROM finance.profit_distributions WHERE id=NEW.reversal_of_id;
    IF NOT FOUND OR original.effect_sign<>1 OR original.profit_calculation_id<>NEW.profit_calculation_id
       OR original.order_id<>NEW.order_id THEN
      RAISE EXCEPTION 'FINANCE_DISTRIBUTION_REVERSAL_ORIGINAL_INVALID';
    END IF;
    IF NEW.distributable_base_toman<>-original.distributable_base_toman
       OR NEW.physical_owner_percent<>original.physical_owner_percent
       OR NEW.online_owner_percent<>original.online_owner_percent
       OR NEW.physical_owner_share_toman<>-original.physical_owner_share_toman
       OR NEW.online_owner_share_toman<>-original.online_owner_share_toman THEN
      RAISE EXCEPTION 'FINANCE_DISTRIBUTION_REVERSAL_SNAPSHOT_MISMATCH';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_distribution_lineage ON finance.profit_distributions;
CREATE CONSTRAINT TRIGGER trg_finance_distribution_lineage
AFTER INSERT OR UPDATE OF profit_calculation_id,order_id,distributable_base_toman,physical_owner_percent,
  online_owner_percent,physical_owner_share_toman,online_owner_share_toman,effect_sign,reversal_of_id
ON finance.profit_distributions DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION finance.assert_distribution_lineage();

CREATE OR REPLACE FUNCTION finance.prevent_distribution_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_IMMUTABLE'; END IF;

  IF OLD.effect_sign=-1 THEN
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_REVERSAL_IMMUTABLE'; END IF;
    RETURN NEW;
  END IF;

  IF OLD.status='finalized' AND NEW.status='reversed' THEN
    IF ROW(
      NEW.id,NEW.profit_calculation_id,NEW.order_id,NEW.distributable_base_toman,
      NEW.physical_owner_percent,NEW.online_owner_percent,NEW.physical_owner_share_toman,
      NEW.online_owner_share_toman,NEW.reversal_of_id,NEW.finalized_at,NEW.created_at,NEW.effect_sign
    ) IS DISTINCT FROM ROW(
      OLD.id,OLD.profit_calculation_id,OLD.order_id,OLD.distributable_base_toman,
      OLD.physical_owner_percent,OLD.online_owner_percent,OLD.physical_owner_share_toman,
      OLD.online_owner_share_toman,OLD.reversal_of_id,OLD.finalized_at,OLD.created_at,OLD.effect_sign
    ) THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_IMMUTABLE'; END IF;
    IF NEW.reversed_at IS NULL THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_REVERSED_AT_REQUIRED'; END IF;
    RETURN NEW;
  END IF;

  IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_distribution_immutable ON finance.profit_distributions;
CREATE TRIGGER trg_finance_distribution_immutable
BEFORE UPDATE OR DELETE ON finance.profit_distributions
FOR EACH ROW EXECUTE FUNCTION finance.prevent_distribution_mutation();

CREATE OR REPLACE FUNCTION finance.assert_distribution_reversal_linkage(p_distribution uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM finance.profit_distributions WHERE id=p_distribution;
  IF st='reversed' AND NOT EXISTS(
    SELECT 1 FROM finance.profit_distributions r
    WHERE r.reversal_of_id=p_distribution AND r.effect_sign=-1 AND r.status='finalized'
  ) THEN RAISE EXCEPTION 'FINANCE_DISTRIBUTION_REVERSAL_RECORD_REQUIRED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_distribution_reversal_linkage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM finance.assert_distribution_reversal_linkage(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_distribution_reversal_linkage ON finance.profit_distributions;
CREATE CONSTRAINT TRIGGER trg_finance_distribution_reversal_linkage
AFTER INSERT OR UPDATE OF status ON finance.profit_distributions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION finance.trg_distribution_reversal_linkage();

COMMIT;
