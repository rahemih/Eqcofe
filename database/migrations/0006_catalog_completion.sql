ALTER TABLE catalog.attributes
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE catalog.attribute_values
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1 CHECK (version > 0);

CREATE TABLE IF NOT EXISTS catalog.product_attribute_values (
  product_id uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES catalog.attributes(id) ON DELETE RESTRICT,
  attribute_value_id uuid NOT NULL REFERENCES catalog.attribute_values(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(product_id, attribute_id)
);
CREATE INDEX IF NOT EXISTS ix_catalog_product_attribute_values_value
  ON catalog.product_attribute_values(attribute_value_id, product_id);
CREATE INDEX IF NOT EXISTS ix_catalog_variant_attribute_values_value
  ON catalog.variant_attribute_values(attribute_value_id, variant_id);

CREATE OR REPLACE FUNCTION catalog.validate_attribute_value_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual_attribute uuid;
BEGIN
  SELECT attribute_id INTO actual_attribute FROM catalog.attribute_values WHERE id=NEW.attribute_value_id;
  IF actual_attribute IS NULL OR actual_attribute <> NEW.attribute_id THEN
    RAISE EXCEPTION 'ATTRIBUTE_VALUE_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_catalog_validate_product_attribute_value ON catalog.product_attribute_values;
CREATE TRIGGER trg_catalog_validate_product_attribute_value
BEFORE INSERT OR UPDATE ON catalog.product_attribute_values
FOR EACH ROW EXECUTE FUNCTION catalog.validate_attribute_value_reference();

DROP TRIGGER IF EXISTS trg_catalog_validate_variant_attribute_value ON catalog.variant_attribute_values;
CREATE TRIGGER trg_catalog_validate_variant_attribute_value
BEFORE INSERT OR UPDATE ON catalog.variant_attribute_values
FOR EACH ROW EXECUTE FUNCTION catalog.validate_attribute_value_reference();

CREATE OR REPLACE FUNCTION catalog.validate_product_media_variant()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE variant_product uuid;
BEGIN
  IF NEW.variant_id IS NULL THEN RETURN NEW; END IF;
  SELECT product_id INTO variant_product FROM catalog.product_variants WHERE id=NEW.variant_id;
  IF variant_product IS NULL OR variant_product <> NEW.product_id THEN
    RAISE EXCEPTION 'MEDIA_VARIANT_PRODUCT_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_catalog_validate_product_media_variant ON catalog.product_media;
CREATE TRIGGER trg_catalog_validate_product_media_variant
BEFORE INSERT OR UPDATE ON catalog.product_media
FOR EACH ROW EXECUTE FUNCTION catalog.validate_product_media_variant();
