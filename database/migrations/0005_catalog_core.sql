CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS catalog.sales_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  global_sales_enabled boolean NOT NULL DEFAULT true,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO catalog.sales_settings(singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS catalog.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fa varchar(150) NOT NULL,
  name_en varchar(150),
  slug varchar(180) NOT NULL,
  description text,
  status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sales_enabled boolean NOT NULL DEFAULT true,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_brands_slug_ci ON catalog.brands(lower(slug));

CREATE TABLE IF NOT EXISTS catalog.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  name_fa varchar(150) NOT NULL,
  slug varchar(180) NOT NULL,
  description text,
  status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sales_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_categories_slug_ci ON catalog.categories(lower(slug));
CREATE INDEX IF NOT EXISTS ix_catalog_categories_parent_sort ON catalog.categories(parent_id,sort_order);

CREATE TABLE IF NOT EXISTS catalog.attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES catalog.categories(id) ON DELETE SET NULL,
  name_fa varchar(150) NOT NULL,
  key varchar(120) NOT NULL UNIQUE,
  data_type varchar(30) NOT NULL CHECK (data_type IN ('text','number','boolean','select')),
  unit varchar(40),
  is_variant_attribute boolean NOT NULL DEFAULT false,
  is_filterable boolean NOT NULL DEFAULT false,
  is_comparable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog.attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES catalog.attributes(id) ON DELETE RESTRICT,
  value_text varchar(300), value_numeric numeric(20,6), value_boolean boolean,
  normalized_value varchar(300), sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(value_text,value_numeric,value_boolean)=1)
);
CREATE INDEX IF NOT EXISTS ix_catalog_attribute_values_attribute ON catalog.attribute_values(attribute_id,sort_order);

CREATE TABLE IF NOT EXISTS catalog.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES catalog.brands(id) ON DELETE RESTRICT,
  primary_category_id uuid NOT NULL REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  name_fa varchar(250) NOT NULL,
  name_en varchar(250),
  slug varchar(220) NOT NULL,
  short_description text,
  description text,
  status varchar(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  sales_enabled boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  archived_at timestamptz,
  archive_reason text,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='published') = (published_at IS NOT NULL) OR status='archived'),
  CHECK ((status='archived') = (archived_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_products_slug_ci ON catalog.products(lower(slug));
CREATE INDEX IF NOT EXISTS ix_catalog_products_public ON catalog.products(primary_category_id,created_at DESC) WHERE status='published';
CREATE INDEX IF NOT EXISTS ix_catalog_products_brand ON catalog.products(brand_id,status);

CREATE TABLE IF NOT EXISTS catalog.product_categories (
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES catalog.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(product_id,category_id)
);

CREATE TABLE IF NOT EXISTS catalog.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
  sku varchar(120) NOT NULL,
  barcode varchar(120),
  name_suffix varchar(180),
  status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sales_enabled boolean NOT NULL DEFAULT true,
  weight_grams integer CHECK (weight_grams IS NULL OR weight_grams > 0),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_variants_sku_ci ON catalog.product_variants(lower(sku));
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_variants_barcode ON catalog.product_variants(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_catalog_variants_product ON catalog.product_variants(product_id,status);

CREATE TABLE IF NOT EXISTS catalog.variant_attribute_values (
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES catalog.attributes(id) ON DELETE RESTRICT,
  attribute_value_id uuid NOT NULL REFERENCES catalog.attribute_values(id) ON DELETE RESTRICT,
  PRIMARY KEY(variant_id,attribute_id)
);

CREATE TABLE IF NOT EXISTS catalog.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL UNIQUE,
  original_filename varchar(300) NOT NULL,
  mime_type varchar(150) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 char(64),
  status varchar(30) NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','quarantine','processing','active','rejected','deleted')),
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  created_by uuid REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_catalog_media_status ON catalog.media_assets(status,created_at);

CREATE TABLE IF NOT EXISTS catalog.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES catalog.product_variants(id) ON DELETE SET NULL,
  media_id uuid NOT NULL REFERENCES catalog.media_assets(id) ON DELETE RESTRICT,
  media_type varchar(30) NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video','document')),
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  alt_text_fa varchar(300),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id,media_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_primary_media ON catalog.product_media(product_id) WHERE is_primary=true;
CREATE INDEX IF NOT EXISTS ix_catalog_product_media_sort ON catalog.product_media(product_id,sort_order);

INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('products.view','catalog','مشاهده محصولات','normal'),
 ('products.create','catalog','ایجاد محصول','high'),
 ('products.manage','catalog','ویرایش محصول و واریانت','high'),
 ('products.publish','catalog','انتشار محصول','high'),
 ('products.archive','catalog','آرشیو محصول','high'),
 ('products.sales.manage','catalog','توقف و ازسرگیری فروش محصول','high'),
 ('brands.manage','catalog','مدیریت برندها','high'),
 ('categories.manage','catalog','مدیریت دسته‌ها','high'),
 ('media.manage','catalog','مدیریت رسانه محصولات','high'),
 ('sales_control.manage','catalog','کنترل توقف فروش سراسری','critical')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS catalog.sales_control_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type varchar(20) NOT NULL CHECK (scope_type IN ('global','brand','category','product','variant')),
  scope_id uuid,
  sales_enabled boolean NOT NULL,
  affected_count integer NOT NULL CHECK (affected_count >= 0),
  requested_by uuid REFERENCES admin.staff_profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope_type='global' AND scope_id IS NULL) OR (scope_type<>'global' AND scope_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_sales_control_preview_active ON catalog.sales_control_previews(expires_at) WHERE consumed_at IS NULL;
INSERT INTO admin.permissions(key,module,name_fa,risk_level) VALUES
 ('attributes.manage','catalog','مدیریت ویژگی‌های محصول','high')
ON CONFLICT (key) DO NOTHING;
