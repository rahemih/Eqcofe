CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS pricing.base_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  amount_toman bigint NOT NULL CHECK (amount_toman >= 0),
  source_type varchar(30) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','bulk','currency','import','system')),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
ALTER TABLE pricing.base_prices DROP CONSTRAINT IF EXISTS ex_pricing_base_price_no_overlap;
ALTER TABLE pricing.base_prices ADD CONSTRAINT ex_pricing_base_price_no_overlap
  EXCLUDE USING gist (
    variant_id WITH =,
    tstzrange(valid_from, COALESCE(valid_until,'infinity'::timestamptz), '[)') WITH &&
  );
CREATE INDEX IF NOT EXISTS ix_pricing_base_prices_variant_current
  ON pricing.base_prices(variant_id,valid_from DESC);

CREATE TABLE IF NOT EXISTS pricing.price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fa varchar(200) NOT NULL,
  rule_type varchar(50) NOT NULL CHECK (rule_type IN ('discount','quantity_discount','campaign','manual_override')),
  priority integer NOT NULL DEFAULT 100 CHECK (priority >= 0),
  value_type varchar(20) NOT NULL CHECK (value_type IN ('percentage','fixed_toman')),
  value_numeric numeric(20,4) NOT NULL CHECK (value_numeric >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  customer_type varchar(30) CHECK (customer_type IS NULL OR customer_type IN ('retail','wholesale')),
  min_quantity integer CHECK (min_quantity IS NULL OR min_quantity >= 1),
  max_quantity integer CHECK (max_quantity IS NULL OR max_quantity >= 1),
  stacking_policy varchar(30) NOT NULL DEFAULT 'best_only' CHECK (stacking_policy IN ('exclusive','stackable','best_only')),
  is_global boolean NOT NULL DEFAULT false,
  status varchar(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','inactive','expired')),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CHECK (max_quantity IS NULL OR min_quantity IS NULL OR max_quantity >= min_quantity),
  CHECK (value_type <> 'percentage' OR value_numeric <= 100)
);
CREATE INDEX IF NOT EXISTS ix_pricing_rules_active ON pricing.price_rules(status,priority DESC,starts_at,ends_at);

CREATE TABLE IF NOT EXISTS pricing.price_rule_products (
  price_rule_id uuid NOT NULL REFERENCES pricing.price_rules(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
  PRIMARY KEY(price_rule_id,product_id)
);
CREATE TABLE IF NOT EXISTS pricing.price_rule_variants (
  price_rule_id uuid NOT NULL REFERENCES pricing.price_rules(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  PRIMARY KEY(price_rule_id,variant_id)
);
CREATE TABLE IF NOT EXISTS pricing.price_rule_brands (
  price_rule_id uuid NOT NULL REFERENCES pricing.price_rules(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES catalog.brands(id) ON DELETE RESTRICT,
  PRIMARY KEY(price_rule_id,brand_id)
);
CREATE TABLE IF NOT EXISTS pricing.price_rule_categories (
  price_rule_id uuid NOT NULL REFERENCES pricing.price_rules(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  PRIMARY KEY(price_rule_id,category_id)
);

CREATE TABLE IF NOT EXISTS pricing.currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency_code char(3) NOT NULL CHECK (source_currency_code ~ '^[A-Z]{3}$'),
  rate_to_toman numeric(20,6) NOT NULL CHECK (rate_to_toman > 0),
  source_provider_id uuid,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  status varchar(30) NOT NULL DEFAULT 'received' CHECK (status IN ('received','validated','suspicious','rejected','active')),
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_selected_currency_rate ON pricing.currency_rates(source_currency_code) WHERE is_selected=true;
CREATE INDEX IF NOT EXISTS ix_pricing_currency_rates_history ON pricing.currency_rates(source_currency_code,observed_at DESC);

CREATE TABLE IF NOT EXISTS pricing.currency_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fa varchar(200) NOT NULL,
  source_currency_code char(3) NOT NULL CHECK (source_currency_code ~ '^[A-Z]{3}$'),
  coefficient numeric(18,6) NOT NULL CHECK (coefficient >= 0),
  fixed_cost_toman bigint NOT NULL DEFAULT 0 CHECK (fixed_cost_toman >= 0),
  rounding_multiple_toman bigint NOT NULL DEFAULT 1 CHECK (rounding_multiple_toman > 0),
  is_global boolean NOT NULL DEFAULT false,
  status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive')),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pricing.currency_rule_products (
  currency_rule_id uuid NOT NULL REFERENCES pricing.currency_rules(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
  PRIMARY KEY(currency_rule_id,product_id)
);
CREATE TABLE IF NOT EXISTS pricing.currency_rule_variants (
  currency_rule_id uuid NOT NULL REFERENCES pricing.currency_rules(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  PRIMARY KEY(currency_rule_id,variant_id)
);
CREATE TABLE IF NOT EXISTS pricing.currency_rule_brands (
  currency_rule_id uuid NOT NULL REFERENCES pricing.currency_rules(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES catalog.brands(id) ON DELETE RESTRICT,
  PRIMARY KEY(currency_rule_id,brand_id)
);
CREATE TABLE IF NOT EXISTS pricing.currency_rule_categories (
  currency_rule_id uuid NOT NULL REFERENCES pricing.currency_rules(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  PRIMARY KEY(currency_rule_id,category_id)
);

CREATE TABLE IF NOT EXISTS pricing.bulk_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type varchar(30) NOT NULL CHECK (operation_type IN ('bulk_price','currency_impact')),
  status varchar(30) NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed','running','completed','failed','expired')),
  request_payload jsonb NOT NULL,
  affected_count integer NOT NULL CHECK (affected_count >= 0),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_by uuid REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_pricing_bulk_operations_active ON pricing.bulk_operations(expires_at) WHERE status='previewed';

CREATE TABLE IF NOT EXISTS pricing.bulk_operation_items (
  operation_id uuid NOT NULL REFERENCES pricing.bulk_operations(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  old_price_toman bigint NOT NULL CHECK (old_price_toman >= 0),
  proposed_price_toman bigint NOT NULL CHECK (proposed_price_toman >= 0),
  guard_status varchar(30) NOT NULL CHECK (guard_status IN ('passed','blocked','unavailable','not_required')),
  guard_reason varchar(200),
  PRIMARY KEY(operation_id,variant_id)
);

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('pricing.view','pricing','مشاهده قیمت‌ها','normal'),
 ('pricing.manage','pricing','مدیریت قیمت پایه و قوانین قیمت','high'),
 ('pricing.bulk.manage','pricing','اعمال گروهی قیمت','critical'),
 ('pricing.currency.manage','pricing','مدیریت نرخ ارز و اثرگذاری قیمت','critical')
ON CONFLICT (key) DO NOTHING;
