-- Step 68-B — governed Catalog 3D media capability.
-- GLB is the only newly authorized 3D upload format in this stage.
-- Public Product Detail exposure remains unchanged until a later typed frontend contract consumes it.

ALTER TABLE catalog.product_media
  DROP CONSTRAINT IF EXISTS product_media_media_type_check;

ALTER TABLE catalog.product_media
  ADD CONSTRAINT product_media_media_type_check
  CHECK (media_type IN ('image','video','document','model_3d'));
