CREATE TABLE IF NOT EXISTS configuration.configuration_keys(
  key text PRIMARY KEY,
  name_fa text NOT NULL,
  description text NULL,
  value_type text NOT NULL CHECK(value_type IN ('boolean','integer','number','string','json')),
  risk_level text NOT NULL CHECK(risk_level IN ('low','medium','high','critical')),
  scopeable boolean NOT NULL DEFAULT false,
  default_value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS configuration.configuration_values(
  id uuid PRIMARY KEY,
  key text NOT NULL REFERENCES configuration.configuration_keys(key),
  scope_type text NOT NULL DEFAULT 'global',
  scope_id uuid NULL,
  value jsonb NOT NULL,
  version bigint NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz NULL,
  changed_by uuid NULL,
  change_request_id uuid NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT configuration_scope_shape CHECK ((scope_type='global' AND scope_id IS NULL) OR (scope_type<>'global' AND scope_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuration_active_value ON configuration.configuration_values(key,scope_type,COALESCE(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE effective_to IS NULL;
CREATE INDEX IF NOT EXISTS ix_configuration_values_history ON configuration.configuration_values(key,scope_type,scope_id,version DESC);
CREATE TABLE IF NOT EXISTS configuration.change_requests(
  id uuid PRIMARY KEY,
  key text NOT NULL REFERENCES configuration.configuration_keys(key),
  scope_type text NOT NULL DEFAULT 'global',
  scope_id uuid NULL,
  proposed_value jsonb NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK(status IN ('submitted','approved','rejected','cancelled','applied')),
  effective_from timestamptz NULL,
  scheduled_for timestamptz NULL,
  requested_by uuid NOT NULL,
  reviewed_by uuid NULL,
  decision_reason text NULL,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT configuration_change_scope_shape CHECK ((scope_type='global' AND scope_id IS NULL) OR (scope_type<>'global' AND scope_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_configuration_one_open_change ON configuration.change_requests(key,scope_type,COALESCE(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE status IN ('submitted','approved');
CREATE INDEX IF NOT EXISTS ix_configuration_change_status ON configuration.change_requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS configuration.feature_flags(
  key text PRIMARY KEY,
  name_fa text NOT NULL,
  flag_type text NOT NULL CHECK(flag_type IN ('boolean','variant')),
  default_variant text NOT NULL,
  risk_level text NOT NULL CHECK(risk_level IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'disabled' CHECK(status IN ('disabled','enabled','retired')),
  rollout_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(rollout_percent BETWEEN 0 AND 100),
  target_type text NULL,
  target_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  version bigint NOT NULL DEFAULT 1,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO configuration.configuration_keys(key,name_fa,description,value_type,risk_level,scopeable,default_value) VALUES
('commerce.cart_ttl_hours','مهلت نگهداری سبد خرید','مدت اعتبار سبد خرید بر حسب ساعت','integer','medium',false,'168'::jsonb),
('commerce.checkout_ttl_minutes','مهلت Checkout','مدت اعتبار پیش‌فاکتور Checkout بر حسب دقیقه','integer','high',false,'15'::jsonb),
('commerce.reservation_ttl_minutes','مهلت رزرو موجودی','مدت رزرو موجودی Checkout بر حسب دقیقه','integer','high',false,'15'::jsonb),
('commerce.cart_access_token_max_active','حداکثر توکن فعال سبد','حداکثر توکن دسترسی همزمان برای سبد','integer','medium',false,'5'::jsonb),
('orders.pending_ttl_minutes','مهلت تأیید سفارش','مدت وضعیت pending_confirmation بر حسب دقیقه','integer','high',false,'30'::jsonb),
('orders.guest_access_ttl_days','مهلت دسترسی سفارش مهمان','مدت دسترسی سفارش مهمان بر حسب روز','integer','medium',false,'7'::jsonb),
('inventory.low_stock_threshold','حد هشدار کمبود موجودی','کمتر از این تعداد، کمبود موجودی محسوب می‌شود','integer','medium',true,'10'::jsonb),
('inventory.physical_store_reserve_percent','رزرو فروشگاه حضوری','درصد حداقل موجودی محافظت‌شده برای فروش حضوری','number','critical',true,'20'::jsonb),
('catalog.out_of_stock_archive_days','مهلت آرشیو کالای ناموجود','روزهای ناموجودی پیوسته قبل از آرشیو','integer','medium',false,'30'::jsonb),
('pricing.wholesale_quantity_discount_min_qty','حداقل تعداد تخفیف تعدادی','بیش از ۱۰ عدد یعنی حداقل ۱۱','integer','high',false,'11'::jsonb),
('sales.global_sales_enabled','فعال بودن فروش سراسری','کلید توقف/فعال‌سازی فروش آنلاین','boolean','critical',false,'true'::jsonb)
ON CONFLICT(key) DO NOTHING;
