BEGIN;

CREATE SCHEMA IF NOT EXISTS finance;

CREATE TABLE IF NOT EXISTS finance.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL,
  name_fa varchar(200) NOT NULL,
  account_type varchar(30) NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','expense','contra_asset','contra_revenue')),
  normal_balance varchar(10) NOT NULL CHECK(normal_balance IN ('debit','credit')),
  parent_id uuid NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
  system_key varchar(80) NULL,
  is_postable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK(parent_id IS NULL OR parent_id<>id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_accounts_code_ci ON finance.accounts(lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_accounts_system_key ON finance.accounts(system_key) WHERE system_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_finance_accounts_parent ON finance.accounts(parent_id,id);

CREATE TABLE IF NOT EXISTS finance.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number varchar(80) NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','reversed')),
  description text NOT NULL CHECK(length(btrim(description)) BETWEEN 1 AND 1000),
  occurred_at timestamptz NOT NULL,
  posted_at timestamptz NULL,
  reversed_at timestamptz NULL,
  reversal_of_id uuid NULL UNIQUE REFERENCES finance.journal_entries(id) ON DELETE RESTRICT,
  source_type varchar(60) NULL,
  source_id uuid NULL,
  source_event_id uuid NULL,
  created_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  posted_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  reversed_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK((status='draft' AND posted_at IS NULL AND reversed_at IS NULL)
     OR (status='posted' AND posted_at IS NOT NULL AND reversed_at IS NULL)
     OR (status='reversed' AND posted_at IS NOT NULL AND reversed_at IS NOT NULL)),
  CHECK(reversal_of_id IS NULL OR reversal_of_id<>id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_journal_source_event ON finance.journal_entries(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_finance_journal_occurred ON finance.journal_entries(occurred_at DESC,id);
CREATE INDEX IF NOT EXISTS ix_finance_journal_source ON finance.journal_entries(source_type,source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS finance.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES finance.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
  debit_toman bigint NOT NULL DEFAULT 0 CHECK(debit_toman>=0),
  credit_toman bigint NOT NULL DEFAULT 0 CHECK(credit_toman>=0),
  description text NULL CHECK(description IS NULL OR length(description)<=1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK((debit_toman>0 AND credit_toman=0) OR (credit_toman>0 AND debit_toman=0))
);
CREATE INDEX IF NOT EXISTS ix_finance_journal_lines_entry ON finance.journal_lines(journal_entry_id,id);
CREATE INDEX IF NOT EXISTS ix_finance_journal_lines_account ON finance.journal_lines(account_id,journal_entry_id);

CREATE OR REPLACE FUNCTION finance.assert_journal_balanced(p_entry uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE s record; st text;
BEGIN
  SELECT status INTO st FROM finance.journal_entries WHERE id=p_entry;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*) cnt,COALESCE(sum(debit_toman),0) debit_sum,COALESCE(sum(credit_toman),0) credit_sum
    INTO s FROM finance.journal_lines WHERE journal_entry_id=p_entry;
  IF s.cnt<2 THEN RAISE EXCEPTION 'FINANCE_JOURNAL_MIN_LINES'; END IF;
  IF s.debit_sum<>s.credit_sum THEN RAISE EXCEPTION 'FINANCE_JOURNAL_UNBALANCED'; END IF;
END $$;

CREATE OR REPLACE FUNCTION finance.trg_journal_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM finance.assert_journal_balanced(COALESCE(NEW.journal_entry_id,OLD.journal_entry_id));
  IF TG_OP='UPDATE' AND NEW.journal_entry_id<>OLD.journal_entry_id THEN
    PERFORM finance.assert_journal_balanced(OLD.journal_entry_id);
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_finance_journal_lines_balanced ON finance.journal_lines;
CREATE CONSTRAINT TRIGGER trg_finance_journal_lines_balanced
AFTER INSERT OR UPDATE OR DELETE ON finance.journal_lines
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.trg_journal_balanced();

CREATE OR REPLACE FUNCTION finance.trg_journal_header_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('posted','reversed') THEN PERFORM finance.assert_journal_balanced(NEW.id); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_journal_header_balanced ON finance.journal_entries;
CREATE CONSTRAINT TRIGGER trg_finance_journal_header_balanced
AFTER INSERT OR UPDATE OF status ON finance.journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.trg_journal_header_balanced();

CREATE OR REPLACE FUNCTION finance.prevent_posted_journal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM finance.journal_entries WHERE id=COALESCE(OLD.journal_entry_id,NEW.journal_entry_id);
  IF st IN ('posted','reversed') THEN RAISE EXCEPTION 'FINANCE_POSTED_JOURNAL_IMMUTABLE'; END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_finance_lines_prevent_posted_mutation ON finance.journal_lines;
CREATE TRIGGER trg_finance_lines_prevent_posted_mutation
BEFORE UPDATE OR DELETE ON finance.journal_lines FOR EACH ROW EXECUTE FUNCTION finance.prevent_posted_journal_mutation();

CREATE TABLE IF NOT EXISTS finance.costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  order_item_id uuid NULL REFERENCES orders.order_items(id) ON DELETE RESTRICT,
  campaign_id uuid NULL,
  cost_type varchar(60) NOT NULL CHECK(length(btrim(cost_type)) BETWEEN 1 AND 60),
  cost_treatment varchar(40) NOT NULL CHECK(cost_treatment IN ('deduct_before_profit_split','capitalized_into_cost','non_distributable_cost','informational_only')),
  amount_toman bigint NOT NULL CHECK(amount_toman>=0),
  occurred_at timestamptz NOT NULL,
  description text NULL CHECK(description IS NULL OR length(description)<=2000),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','finalized','reversed')),
  reversal_of_id uuid NULL UNIQUE REFERENCES finance.costs(id) ON DELETE RESTRICT,
  source_event_id uuid NULL,
  finalized_at timestamptz NULL,
  reversed_at timestamptz NULL,
  created_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  finalized_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  reversed_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK(order_item_id IS NULL OR order_id IS NOT NULL),
  CHECK(reversal_of_id IS NULL OR reversal_of_id<>id),
  CHECK((status='draft' AND finalized_at IS NULL AND reversed_at IS NULL)
     OR (status='finalized' AND finalized_at IS NOT NULL AND reversed_at IS NULL)
     OR (status='reversed' AND finalized_at IS NOT NULL AND reversed_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_cost_source_event ON finance.costs(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_finance_costs_order ON finance.costs(order_id,occurred_at,id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_finance_costs_treatment ON finance.costs(cost_treatment,status,occurred_at,id);

CREATE OR REPLACE FUNCTION finance.assert_cost_order_item_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_item_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM orders.order_items oi WHERE oi.id=NEW.order_item_id AND oi.order_id=NEW.order_id
  ) THEN RAISE EXCEPTION 'FINANCE_COST_ORDER_ITEM_MISMATCH'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_cost_order_item_lineage ON finance.costs;
CREATE CONSTRAINT TRIGGER trg_finance_cost_order_item_lineage
AFTER INSERT OR UPDATE OF order_id,order_item_id ON finance.costs
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.assert_cost_order_item_lineage();

CREATE TABLE IF NOT EXISTS finance.profit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fa varchar(200) NOT NULL CHECK(length(btrim(name_fa)) BETWEEN 1 AND 200),
  scope_type varchar(20) NOT NULL CHECK(scope_type IN ('global','category','brand','product')),
  scope_id uuid NULL,
  priority integer NOT NULL DEFAULT 0,
  physical_owner_percent numeric(7,4) NOT NULL CHECK(physical_owner_percent BETWEEN 0 AND 100),
  online_owner_percent numeric(7,4) NOT NULL CHECK(online_owner_percent BETWEEN 0 AND 100),
  effective_from timestamptz NOT NULL,
  effective_until timestamptz NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired')),
  created_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK(physical_owner_percent+online_owner_percent=100.0000),
  CHECK((scope_type='global' AND scope_id IS NULL) OR (scope_type<>'global' AND scope_id IS NOT NULL)),
  CHECK(effective_until IS NULL OR effective_until>effective_from)
);
CREATE INDEX IF NOT EXISTS ix_finance_profit_rules_match
  ON finance.profit_rules(scope_type,scope_id,priority DESC,effective_from DESC,id) WHERE status='active';

CREATE OR REPLACE FUNCTION finance.assert_profit_rule_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.scope_type='global' THEN RETURN NEW; END IF;
  IF NEW.scope_type='category' THEN SELECT EXISTS(SELECT 1 FROM catalog.categories WHERE id=NEW.scope_id) INTO ok;
  ELSIF NEW.scope_type='brand' THEN SELECT EXISTS(SELECT 1 FROM catalog.brands WHERE id=NEW.scope_id) INTO ok;
  ELSIF NEW.scope_type='product' THEN SELECT EXISTS(SELECT 1 FROM catalog.products WHERE id=NEW.scope_id) INTO ok;
  END IF;
  IF NOT COALESCE(ok,false) THEN RAISE EXCEPTION 'FINANCE_PROFIT_RULE_SCOPE_NOT_FOUND'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_profit_rule_scope ON finance.profit_rules;
CREATE CONSTRAINT TRIGGER trg_finance_profit_rule_scope
AFTER INSERT OR UPDATE OF scope_type,scope_id ON finance.profit_rules
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.assert_profit_rule_scope();

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
DROP TRIGGER IF EXISTS trg_finance_profit_rule_unambiguous ON finance.profit_rules;
CREATE CONSTRAINT TRIGGER trg_finance_profit_rule_unambiguous
AFTER INSERT OR UPDATE OF scope_type,scope_id,priority,effective_from,effective_until,status
ON finance.profit_rules DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION finance.assert_profit_rule_unambiguous();

CREATE TABLE IF NOT EXISTS finance.profit_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  calculation_stage varchar(20) NOT NULL CHECK(calculation_stage IN ('estimated','provisional','final')),
  net_sales_toman bigint NOT NULL,
  cogs_toman bigint NOT NULL CHECK(cogs_toman>=0),
  online_costs_toman bigint NOT NULL DEFAULT 0 CHECK(online_costs_toman>=0),
  shipping_margin_toman bigint NOT NULL DEFAULT 0,
  profit_before_distribution_toman bigint NOT NULL,
  selected_rule_id uuid NULL REFERENCES finance.profit_rules(id) ON DELETE RESTRICT,
  physical_owner_percent numeric(7,4) NULL CHECK(physical_owner_percent BETWEEN 0 AND 100),
  online_owner_percent numeric(7,4) NULL CHECK(online_owner_percent BETWEEN 0 AND 100),
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(source_snapshot)='object'),
  is_current boolean NOT NULL DEFAULT true,
  supersedes_id uuid NULL REFERENCES finance.profit_calculations(id) ON DELETE RESTRICT,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz NULL,
  finalized_by uuid NULL REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK(profit_before_distribution_toman=net_sales_toman-cogs_toman-online_costs_toman+shipping_margin_toman),
  CHECK((physical_owner_percent IS NULL AND online_owner_percent IS NULL)
     OR (physical_owner_percent IS NOT NULL AND online_owner_percent IS NOT NULL AND physical_owner_percent+online_owner_percent=100.0000)),
  CHECK((calculation_stage='final' AND finalized_at IS NOT NULL AND selected_rule_id IS NOT NULL
         AND physical_owner_percent IS NOT NULL AND online_owner_percent IS NOT NULL)
     OR (calculation_stage<>'final' AND finalized_at IS NULL)),
  CHECK(supersedes_id IS NULL OR supersedes_id<>id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_profit_current_stage
  ON finance.profit_calculations(order_id,calculation_stage) WHERE is_current;
CREATE INDEX IF NOT EXISTS ix_finance_profit_order_time
  ON finance.profit_calculations(order_id,calculated_at DESC,id);

CREATE TABLE IF NOT EXISTS finance.profit_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profit_calculation_id uuid NOT NULL UNIQUE REFERENCES finance.profit_calculations(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE RESTRICT,
  distributable_base_toman bigint NOT NULL,
  physical_owner_percent numeric(7,4) NOT NULL CHECK(physical_owner_percent BETWEEN 0 AND 100),
  online_owner_percent numeric(7,4) NOT NULL CHECK(online_owner_percent BETWEEN 0 AND 100),
  physical_owner_share_toman bigint NOT NULL,
  online_owner_share_toman bigint NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'finalized' CHECK(status IN ('finalized','reversed')),
  reversal_of_id uuid NULL UNIQUE REFERENCES finance.profit_distributions(id) ON DELETE RESTRICT,
  finalized_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  CHECK(physical_owner_percent+online_owner_percent=100.0000),
  CHECK(physical_owner_share_toman+online_owner_share_toman=distributable_base_toman),
  CHECK((status='finalized' AND reversed_at IS NULL) OR (status='reversed' AND reversed_at IS NOT NULL)),
  CHECK(reversal_of_id IS NULL OR reversal_of_id<>id)
);
CREATE INDEX IF NOT EXISTS ix_finance_distributions_order ON finance.profit_distributions(order_id,finalized_at DESC,id);

CREATE OR REPLACE FUNCTION finance.assert_distribution_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c finance.profit_calculations%ROWTYPE;
BEGIN
  SELECT * INTO c FROM finance.profit_calculations WHERE id=NEW.profit_calculation_id;
  IF NOT FOUND OR c.order_id<>NEW.order_id OR c.calculation_stage<>'final' OR NOT c.is_current THEN
    RAISE EXCEPTION 'FINANCE_DISTRIBUTION_CALCULATION_INVALID';
  END IF;
  IF NEW.distributable_base_toman<>c.profit_before_distribution_toman
     OR NEW.physical_owner_percent<>c.physical_owner_percent
     OR NEW.online_owner_percent<>c.online_owner_percent THEN
    RAISE EXCEPTION 'FINANCE_DISTRIBUTION_SNAPSHOT_MISMATCH';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_finance_distribution_lineage ON finance.profit_distributions;
CREATE CONSTRAINT TRIGGER trg_finance_distribution_lineage
AFTER INSERT OR UPDATE OF profit_calculation_id,order_id,distributable_base_toman,physical_owner_percent,online_owner_percent
ON finance.profit_distributions DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION finance.assert_distribution_lineage();

CREATE TABLE IF NOT EXISTS finance.source_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system varchar(60) NOT NULL,
  source_event_id uuid NOT NULL,
  effect_type varchar(60) NOT NULL,
  aggregate_id uuid NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  payload_hash char(64) NULL,
  UNIQUE(source_system,source_event_id,effect_type)
);
CREATE INDEX IF NOT EXISTS ix_finance_source_applications_aggregate
  ON finance.source_applications(aggregate_id,applied_at DESC,id) WHERE aggregate_id IS NOT NULL;

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('finance.view','finance','مشاهده اطلاعات مالی','high'),
 ('finance.accounts.manage','finance','مدیریت سرفصل‌های حسابداری','critical'),
 ('finance.journal.create','finance','ایجاد سند حسابداری','high'),
 ('finance.journal.post','finance','ثبت قطعی سند حسابداری','critical'),
 ('finance.journal.reverse','finance','برگشت سند حسابداری','critical'),
 ('finance.cost.manage','finance','مدیریت هزینه‌های مالی','high'),
 ('finance.cost.finalize','finance','قطعی‌کردن هزینه مالی','critical'),
 ('finance.cost.reverse','finance','برگشت هزینه مالی','critical'),
 ('finance.profit.recalculate','finance','محاسبه مجدد سود','critical'),
 ('finance.profit.finalize','finance','قطعی‌کردن سود سفارش','critical'),
 ('finance.profit_rule.manage','finance','مدیریت قواعد تقسیم سود','critical'),
 ('finance.report.view','finance','مشاهده گزارش‌های مالی','high'),
 ('finance.export','finance','خروجی‌گیری مالی','high')
ON CONFLICT(key) DO NOTHING;

COMMIT;
