BEGIN;

ALTER TABLE admin.permissions
  DROP CONSTRAINT IF EXISTS permissions_risk_level_check;

ALTER TABLE admin.permissions
  ADD CONSTRAINT permissions_risk_level_check
  CHECK (risk_level IN ('low', 'normal', 'high', 'sensitive', 'critical'));

COMMIT;
